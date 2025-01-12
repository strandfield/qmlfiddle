// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#pragma once

#include <QObject>

#include <emscripten/val.h>

class QQmlComponent;
class QQmlEngine;
class QQuickItem;
class QQuickView;

class ResourceManager;

class Controller : public QObject
{
  Q_OBJECT
public:
  explicit Controller(QObject* parent = nullptr);

  ResourceManager& resourceManager() const;

  void init();

  QQuickView* view() const;
  QQmlEngine* engine() const;

  void lintSource(const emscripten::val& promiseResolve, const std::string& str);
  QQmlComponent* lastLintComponent() const;

  QQmlComponent* currentComponent() const;
  void setCurrentComponent(QQmlComponent* component);

  void useLastLintAsSource();

  void sendMessage(const std::string& str);

  static QByteArray saltedHash(const QByteArray& data);

  void setBackgroundColor(const QString& colorName);

public:
  emscripten::val onCurrentItemChanged;
  emscripten::val onLintComponentReady;
  emscripten::val messageHandler;

protected Q_SLOTS:
  void onLintCompleted();

protected:
  void setLastLintComponent(QQmlComponent* component);
  void createItem(QQmlComponent& component);

public:
  static Controller* instance();

private:
  static Controller* g_globalInstance;

private:
  ResourceManager* m_resourceManager = nullptr;
  QQuickView* m_view = nullptr;
  QQmlComponent* m_lint_component = nullptr;
  QQmlComponent* m_component = nullptr;
  QQuickItem* m_item = nullptr;
};
