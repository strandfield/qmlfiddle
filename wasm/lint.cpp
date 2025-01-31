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

#include <QFile>

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
  if(resolve.isUndefined()) {
    return;
  }

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
  if(resolve.isUndefined()) {
    return;
  }

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
  if(resolve.isUndefined()) {
    return;
  }

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

void appendDiagnostics(std::vector<Diagnostic>& output, const std::vector<SourcePreprocessor::PragmaResource>& missingResources)
{
  output.reserve(output.size()+ missingResources.size());

  for(const auto& missing : missingResources)
  {
    Diagnostic d;
    d.line = missing.line;
    d.message = "no such resource";
    output.push_back(d);
  }
}

void appendDiagnostics(std::vector<Diagnostic>& output, const std::vector<SourcePreprocessor::PragmaImport>& missingImports)
{
  output.reserve(output.size()+ missingImports.size());

  for(const auto& missing : missingImports)
  {
    Diagnostic d;
    d.line = missing.line;
    d.message = "no such fiddle";
    output.push_back(d);
  }
}

void processImports(ResourceManager& resManager, const std::vector<SourcePreprocessor::PragmaImport>& imports)
{
  for (const SourcePreprocessor::PragmaImport& element : imports)
  {
    const QString srcpath = resManager.getQmlPath(element.fiddleId);

    if (!QFile::exists(srcpath))
    {
      qDebug() << srcpath << " does not exist";
      continue;
    }

    const QString savepath = "/home/web_user/qml/" + element.componentName + ".qml";
    if (QFile::exists(savepath))
    {
      QFile::remove(savepath);
    }

    bool ok = QFile::link(srcpath, savepath);

    if (!ok) {
      qDebug() << "symlink creation failed for " << srcpath << " as " << savepath;
    }
  }
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

  std::vector<Diagnostic> diagnostics;

  // checking "rcc" resources
  {
    std::vector<SourcePreprocessor::PragmaResource> missing_resources;

    for (const SourcePreprocessor::PragmaResource& resource : preprocessor.getResources())
    {
      std::optional<ResourceManager::ResourceInfo> info = m_resourceManager.getResourceInfo(resource.name, ResourceManager::RccFile);
      if (!info.has_value() || info->state == ResourceManager::Loading)
      {
        fetching_resource = true;

        if(!info.has_value())
        {
          // TODO: do not fetch the resource, just check it exists ?
          m_resourceManager.fetchRcc(resource.name);
        }
      }
      else if (info->state == ResourceManager::NotFound)
      {
        missing_resources.push_back(resource);
      }
    }

    appendDiagnostics(diagnostics, missing_resources);
  }

  // checking imported qml files
  {
    std::vector<SourcePreprocessor::PragmaImport> missing_imports;

    for (const SourcePreprocessor::PragmaImport& element : preprocessor.getImports())
    {
      std::optional<ResourceManager::ResourceInfo> info = m_resourceManager.getResourceInfo(element.fiddleId, ResourceManager::QmlFile);
      if (!info.has_value() || info->state == ResourceManager::Loading)
      {
        fetching_resource = true;

        if(!info.has_value())
        {
          // TODO: do not fetch the resource, just check it exists ?
          m_resourceManager.fetchQml(element.fiddleId);
        }
      }
      else if (info->state == ResourceManager::NotFound)
      {
        missing_imports.push_back(element);
      }
    }

    appendDiagnostics(diagnostics, missing_imports);
  }

  if (!diagnostics.empty())
  {
    sendErrors(diagnostics, m_data, m_promiseResolve);
    Q_EMIT lintCompleted();
    return;
  }

  if (!fetching_resource)
  {
    processImports(m_resourceManager, preprocessor.getImports());
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

  const QString filepath{"/home/web_user/qml/main.qml"};
  // apparently we need to write the file if we want to have inline-components working
  QFile file {filepath};
  if (!file.open(QIODevice::ReadWrite | QIODevice::Truncate))
  {
    qDebug() << "could not open " << filepath;
  }
  file.write(m_data);
  file.close();

  m_component->setData(m_data, QUrl::fromLocalFile(filepath));
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
    if (!m_promiseResolve.isUndefined()) {
      std::string result = "[]";
      m_promiseResolve(result);
    }
    Q_EMIT lintCompleted();
  }
}
