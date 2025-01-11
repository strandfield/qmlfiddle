// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#include "lint.h"

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

} // namespace


QmlSourceLint::QmlSourceLint(QQmlEngine& qmlEngine, const emscripten::val& resolveFunc, const QByteArray& src, QObject* parent)
    : QObject(parent),
    m_qmlEngine(qmlEngine),
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
