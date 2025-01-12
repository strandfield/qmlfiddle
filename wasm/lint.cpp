// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#include "lint.h"

#include "preprocessor.h"
#include "resources.h"

#include <QQmlComponent>

#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>

namespace
{

int mapSourcePos(const QString& src, int line, int col)
{
  int n = 0;

  while(line > 1)
  {
    n = src.indexOf('\n', n) + 1;
    --line;
  }

  return std::max(n + col - 1, 0);
}

struct Diagnostic
{
  int line;
  int column = 1;
  QString message;
};

void sendErrors(const std::vector<Diagnostic>& diagnostics, const QByteArray& data, const emscripten::val& resolve)
{
  const QString source_code = QString::fromUtf8(data);

  QJsonArray errlist;

  for(const Diagnostic& d : diagnostics)
  {
    int pos = mapSourcePos(source_code, d.line, d.column);

    auto obj = QJsonObject{
        {"from", pos},
        {"to", pos},
        {"severity", "error"},
        {"message", d.message}
    };

    errlist.push_back(obj);
  }

  std::string result = QJsonDocument(errlist).toJson(QJsonDocument::Compact).constData();
  resolve(result);
}

void sendErrors(const QList<QQmlError>& errors, const QByteArray& data, const emscripten::val& resolve)
{
  std::vector<Diagnostic> diagnostics;
  diagnostics.reserve(errors.size());

  for(const auto& e : errors)
  {
    Diagnostic d;
    d.line = e.line();
    d.column = e.column();
    d.message = e.description();
    diagnostics.push_back(d);
  }

  return sendErrors(diagnostics, data, resolve);
}

void sendErrors(const std::vector<SourcePreprocessor::Error>& errors, const QByteArray& data, const emscripten::val& resolve)
{
  std::vector<Diagnostic> diagnostics;
  diagnostics.reserve(errors.size());

  for(const auto& e : errors)
  {
    Diagnostic d;
    d.line = e.line;
    d.message = e.message;
    diagnostics.push_back(d);
  }

  return sendErrors(diagnostics, data, resolve);
}

void sendErrors(const std::vector<SourcePreprocessor::PragmaResource>& missingResources, const QByteArray& data, const emscripten::val& resolve)
{
  std::vector<Diagnostic> diagnostics;
  diagnostics.reserve(missingResources.size());

  for(const auto& missing : missingResources)
  {
    Diagnostic d;
    d.line = missing.line;
    d.message = "no such resource";
    diagnostics.push_back(d);
  }

  return sendErrors(diagnostics, data, resolve);
}

} // namespace


QmlSourceLint::QmlSourceLint(QQmlEngine& qmlEngine, ResourceManager& resourceManager, const emscripten::val& resolveFunc, const QByteArray& src, QObject* parent)
    : QObject(parent),
    m_qmlEngine(qmlEngine),
    m_resourceManager(resourceManager),
    m_promiseResolve(resolveFunc),
    m_data(src)
{

}

QQmlComponent* QmlSourceLint::component() const
{
  return m_component;
}

void QmlSourceLint::start()
{
  SourcePreprocessor preprocessor;
  QByteArray src = preprocessor.preprocess(m_data);

  if (!preprocessor.getErrors().empty())
  {
    sendErrors(preprocessor.getErrors(), m_data, m_promiseResolve);
    Q_EMIT lintCompleted();
  }

  bool fetching_resource = false;

  std::vector<SourcePreprocessor::PragmaResource> missing_resources;

  for (const SourcePreprocessor::PragmaResource& resource : preprocessor.getResources())
  {
    std::optional<ResourceManager::ResourceState> info = m_resourceManager.getResourceInfo(resource.name);
    if (!info.has_value() || *info == ResourceManager::Loading)
    {
      fetching_resource = true;

      if(!info.has_value())
      {
        // TODO: do not fetch the resource, just check it exists ?
        m_resourceManager.fetchResource(resource.name);
      }
    }
    else if (*info == ResourceManager::NotFound)
    {
      missing_resources.push_back(resource);
    }
  }


  if (!missing_resources.empty())
  {
    sendErrors(missing_resources, m_data, m_promiseResolve);
    Q_EMIT lintCompleted();
    return;
  }

  if (!fetching_resource)
  {
    m_data = src;
    compileComponent();
  }
  else
  {
    connect(&m_resourceManager, &ResourceManager::ready, this, &QmlSourceLint::start);
  }
}

void QmlSourceLint::compileComponent()
{
  m_component = new QQmlComponent(&m_qmlEngine, this);
  connect(m_component,
          &QQmlComponent::statusChanged,
          this,
          &QmlSourceLint::onComponentStatusChanged);
  m_component->setData(m_data, QUrl());
}

void QmlSourceLint::onComponentStatusChanged()
{
  auto *component = qobject_cast<QQmlComponent *>(sender());

  if (!component || component != m_component)
    return;

  if (m_component->status() == QQmlComponent::Error) {
    sendErrors(m_component->errors(), m_data, m_promiseResolve);
    Q_EMIT lintCompleted();
    m_component->deleteLater();
    m_component = nullptr;
  } else if (m_component->status() == QQmlComponent::Ready) {
    std::string result = "[]";
    m_promiseResolve(result);
    Q_EMIT lintCompleted();
  }
}
