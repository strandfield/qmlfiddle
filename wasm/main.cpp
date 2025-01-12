// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#include "controller.h"

#include <QGuiApplication>

#include <QQmlEngineExtensionPlugin>

#include <emscripten.h>
#include <emscripten/bind.h>


// https://doc.qt.io/qt-6/qtplugin.html#Q_IMPORT_PLUGIN
Q_IMPORT_QML_PLUGIN(QtQuickLayoutsPlugin)
Q_IMPORT_QML_PLUGIN(QtQuickControls2Plugin)

/*
 * emscripten bindings
 */

// Useful: https://emscripten.org/docs/porting/connecting_cpp_and_javascript/index.html

extern "C" {

EMSCRIPTEN_KEEPALIVE void lint_source(const emscripten::val& resolveFunc, const std::string &str)
{
  if (Controller::instance())
  {
    Controller::instance()->lintSource(resolveFunc, str);
  }
}

EMSCRIPTEN_KEEPALIVE void use_last_lint_as_source()
{
  auto* c = Controller::instance();
  if (c)
  {
    c->useLastLintAsSource();
  }

}

EMSCRIPTEN_KEEPALIVE void set_message_handler(const emscripten::val& handler)
{
  auto* c = Controller::instance();
  if (c)
  {
    c->messageHandler = handler;
  }
}

EMSCRIPTEN_KEEPALIVE void set_current_item_changed_handler(const emscripten::val& handler)
{
  auto* c = Controller::instance();
  if (c)
  {
    c->onCurrentItemChanged = handler;
  }
}

EMSCRIPTEN_KEEPALIVE void set_lint_ready_handler(const emscripten::val& handler)
{
  auto* c = Controller::instance();
  if (c)
  {
    c->onLintComponentReady = handler;
  }
}

// note: this is not signing in the cryptographic sense of the term, but rather
// a salted hash. because the salt is supposed to be kept secret between the wasm
// and the server, this should provide a sufficient auth method (although pretty weak
// on paper).
EMSCRIPTEN_KEEPALIVE std::string sign_source_code(const std::string &text)
{
  return Controller::saltedHash(QByteArray::fromStdString(text)).toStdString();
}

EMSCRIPTEN_KEEPALIVE void set_background_color(const std::string &text)
{
  auto* c = Controller::instance();
  if (c)
  {
    c->setBackgroundColor(QString::fromStdString(text));
  }
}

} // extern "C"

EMSCRIPTEN_BINDINGS(my_module)
{
  emscripten::function("qmlfiddle_lintSource", &lint_source);
  emscripten::function("qmlfiddle_UseLastLintAsSource", &use_last_lint_as_source);
  emscripten::function("qmlfiddle_setMessageHandler", &set_message_handler);
  emscripten::function("qmlfiddle_onCurrentItemChanged", &set_current_item_changed_handler);
  emscripten::function("qmlfiddle_onLintReady", &set_lint_ready_handler);
  emscripten::function("qmlfiddle_sign", &sign_source_code);
  emscripten::function("qmlfiddle_setBackgroundColor", &set_background_color);
}

/*
 * end
 */

int main(int argc, char* argv[])
{
  QGuiApplication app(argc, argv);

  Q_INIT_RESOURCE(qmlfiddle);

  Controller controller;
  controller.init();

  return app.exec();
}
