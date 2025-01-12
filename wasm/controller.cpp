// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#include "controller.h"

#include "modules/file-utils.h"
#include "modules/qml-fiddle.h"

#include "lint.h"
#include "resources.h"

#include <QQmlComponent>
#include <QQmlEngine>
#include <QQuickView>
#include <QQuickItem>

#include <QCryptographicHash>

#include <QDebug>

#ifndef HASHING_SALT
#error A HASHING_SALT must be provided
#endif

void myMessageHandler(QtMsgType type, const QMessageLogContext & context, const QString & text)
{
  if(Controller::instance())
  {
    Controller::instance()->sendMessage(qFormatLogMessage(type, context, text).toStdString());
  }
}

Controller* Controller::g_globalInstance = nullptr;

Controller::Controller(QObject *parent)
    : QObject(parent)
{
  m_resourceManager = new ResourceManager(this);

  qInstallMessageHandler(myMessageHandler);

  g_globalInstance = this;
}

ResourceManager& Controller::resourceManager() const
{
  return *m_resourceManager;
}

void Controller::init()
{
  m_view = new QQuickView;
  m_view->setResizeMode(QQuickView::SizeRootObjectToView);

  // Note: qml seems to require singleton names to start with an uppercase letter.
  // We therefore cannot have "fileUtils", but need "FileUtils" instead.
  qmlRegisterSingletonInstance("FileUtils", 1, 0, "FileUtils", new FileUtils(this));
  qmlRegisterSingletonInstance("QmlFiddle", 1, 0, "QmlFiddle", new QmlFiddle(this));

  m_view->setSource(QUrl("qrc:/qmlfiddle/main.qml"));

  m_view->show();
}

QQuickView* Controller::view() const
{
  return m_view;
}

QQmlEngine* Controller::engine() const
{
  return view() ? view()->engine() : nullptr;
}

void Controller::lintSource(const emscripten::val& promiseResolve, const std::string &str)
{
  auto* lint = new QmlSourceLint(*engine(), resourceManager(), promiseResolve, str.c_str(), this);
  connect(lint, &QmlSourceLint::lintCompleted, this, &Controller::onLintCompleted);
  lint->start();
}

QQmlComponent* Controller::currentComponent() const
{
  return m_component;
}

void Controller::setCurrentComponent(QQmlComponent* component)
{
  if (m_component == component) {
    return;
  }
  if (m_component) {
    m_component->deleteLater();
    m_component = nullptr;
  }

  m_component = component;

  if (m_component) {
    createItem(*m_component);
  }
}

void Controller::useLastLintAsSource()
{
  if (lastLintComponent())
  {
    setCurrentComponent(lastLintComponent());
  }
}

QQmlComponent* Controller::lastLintComponent() const
{
  return m_lint_component;
}

void Controller::sendMessage(const std::string& str)
{
  if (!messageHandler.isUndefined())
  {
    messageHandler(str);
  }
}

 QByteArray Controller::saltedHash(const QByteArray& data)
{
  QCryptographicHash hash{QCryptographicHash::Sha1};
  hash.addData(data);
  hash.addData(HASHING_SALT);
  return hash.result().toHex();
}

void Controller::setBackgroundColor(const QString& colorName)
{
  findChild<QmlFiddle*>(Qt::FindDirectChildrenOnly)->setBackgroundColor(colorName);
}

void Controller::onLintCompleted()
{
  auto* lint = qobject_cast<QmlSourceLint*>(sender());

  if(!lint) {
    return;
  }

  if (lint->component()->status() == QQmlComponent::Ready) {
    setLastLintComponent(lint->component());
    if (!onLintComponentReady.isUndefined())
    {
      onLintComponentReady();
    }
  }

  lint->deleteLater();
}

void Controller::setLastLintComponent(QQmlComponent* component) {
  if (m_lint_component == component) {
    return;
  }
  if (m_lint_component && m_lint_component != m_component) {
    m_lint_component->deleteLater();
    m_lint_component = nullptr;
  }

  m_lint_component = component;
  m_lint_component->setParent(this);
}

void Controller::createItem(QQmlComponent &component)
{
  QObject *obj = component.beginCreate(m_view->engine()->rootContext());

  if (!obj) {
    qDebug() << "beginCreate() failed";
    return;
  }

  auto *item = qobject_cast<QQuickItem *>(obj);

  if (!item) {
    qDebug() << "beginCreate() did not produce a QQuickItem";
    return;
  }

  if (m_item) {
    m_item->setVisible(false);
    m_item->deleteLater();
  }

  m_item = item;

  QQmlEngine::setObjectOwnership(m_item, QQmlEngine::JavaScriptOwnership);
  m_item->setParentItem(m_view->rootObject());
  m_item->setParent(m_view->rootObject());

  component.completeCreate();

  if (!onCurrentItemChanged.isUndefined())
  {
    onCurrentItemChanged();
  }
}


Controller* Controller::instance()
{
  return g_globalInstance;
}

