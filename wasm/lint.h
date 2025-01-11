// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#pragma once

#include <QObject>

#include <emscripten/val.h>

class QQmlComponent;
class QQmlEngine;

class QmlSourceLint : public QObject
{
  Q_OBJECT
public:
  QmlSourceLint(QQmlEngine& qmlEngine, const emscripten::val& resolveFunc, const QByteArray& src, QObject* parent = nullptr);

  void start();

  QQmlComponent* component() const;

Q_SIGNALS:
  void lintCompleted();

protected Q_SLOTS:

  void onComponentStatusChanged();

private:
  QQmlEngine& m_qmlEngine;
  emscripten::val m_promiseResolve;
  QByteArray m_data;
  QQmlComponent* m_component = nullptr;
};
