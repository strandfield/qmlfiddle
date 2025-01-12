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

QJsonObject toJson(const QQmlError& err, const QString& sourceCode)
{
  int pos = mapSourcePos(sourceCode, err.line(), err.column());

  return QJsonObject{
      {"from", pos},
      {"to", pos},
      {"severity", "error"},
      {"message", err.description()}
  };
}

QJsonArray toJson(const QList<QQmlError>& errors, const QString& sourceCode)
{
  QJsonArray result;

  for(const QQmlError& err : errors) {
    result.append(toJson(err,sourceCode));
  }

  return result;
}

void sendErrors(const QList<QQmlError>& errors, const QByteArray& data, const emscripten::val& resolve)
{
  const QString source_code = QString::fromUtf8(data);
  QJsonArray jsarray = toJson(errors,source_code);
  std::string result = QJsonDocument(jsarray).toJson(QJsonDocument::Compact).constData();
  resolve(result);
}

void sendErrors(const std::vector<SourcePreprocessor::PragmaResource>& missingResources, const QByteArray& data, const emscripten::val& resolve)
{
  const QString source_code = QString::fromUtf8(data);

  QJsonArray errlist;

  for(const SourcePreprocessor::PragmaResource& res : missingResources)
  {
    int pos = mapSourcePos(source_code, res.line, 1);

    auto obj = QJsonObject{
        {"from", pos},
        {"to", pos},
        {"severity", "error"},
        {"message", "no such resource"}
    };

    errlist.push_back(obj);
  }

  std::string result = QJsonDocument(errlist).toJson(QJsonDocument::Compact).constData();
  resolve(result);
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

  qDebug() << src;
  qDebug()  << preprocessor.getResources().size() << " resources";

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
        m_resourceManager.fetchResource(QString::fromUtf8(resource.name));
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
