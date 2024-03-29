#include <QGuiApplication>

#include <QQuickView>

#include <QQmlComponent>
#include <QQmlEngine>
#include <QQuickItem>

#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>

#include <QTimer>

#include <emscripten.h>
#include <emscripten/bind.h>

#include <algorithm>

// Useful: https://emscripten.org/docs/porting/connecting_cpp_and_javascript/index.html

EM_JS(void, notifyCurrentItemChange, (), {
    if (onCurrentItemChanged) {
        onCurrentItemChanged();
    }
})

EM_JS(void, notifyLintComponentIsReady, (), {
  if (onLintComponentIsReady) {
    onLintComponentIsReady();
  }
})


class Controller;

class QmlSourceLint : public QObject
{
  Q_OBJECT
public:
  QmlSourceLint(Controller& controller, const emscripten::val& resolveFunc, const QByteArray& src);

  void start();

  QQmlComponent* component() const {
    return m_component;
  }

Q_SIGNALS:
  void lintCompleted();

protected Q_SLOTS:

  void onComponentStatusChanged()
  {
    auto *component = qobject_cast<QQmlComponent *>(sender());

    if (!component || component != m_component)
      return;

    if (m_component->status() == QQmlComponent::Error) {
      sendErrors(m_component->errors());
      Q_EMIT lintCompleted();
      m_component->deleteLater();
      m_component = nullptr;
    } else if (m_component->status() == QQmlComponent::Ready) {
      std::string result = "[]";
      m_resolve_func(result);
      Q_EMIT lintCompleted();
    }
  }

protected:

  int mapSourcePos(int line, int col) const
  {
    int n = 0;

    while(line > 1)
    {
      n = m_src.indexOf('\n', n) + 1;
      --line;
    }

    return std::max(n + col - 1, 0);
  }

  QJsonObject toJson(const QQmlError& err) const
  {
    int pos = mapSourcePos(err.line(), err.column());

    return QJsonObject{
        {"from", pos},
        {"to", pos},
        {"severity", "error"},
        {"message", err.description()}
    };
  }

  QJsonArray toJson(const QList<QQmlError>& errors) const
  {
    QJsonArray result;

    for(const QQmlError& err : errors) {
      result.append(toJson(err));
    }

    return result;
  }


  void sendErrors(const QList<QQmlError>& errors)
  {
    QJsonArray jsarray = toJson(errors);
    std::string result = QJsonDocument(jsarray).toJson(QJsonDocument::Compact).constData();
    m_resolve_func(result);
  }

private:
  Controller& m_controller;
  emscripten::val m_resolve_func;
  QByteArray m_data;
  QString m_src;
  QQmlComponent* m_component = nullptr;
};

class Controller : public QObject
{
    Q_OBJECT
public:
    explicit Controller(QQuickView &view, QObject *parent = nullptr)
        : QObject(parent)
        , m_view(&view)
    {}

    QQmlEngine* engine() const
    {
      return m_view->engine();
    }

    void lintSource(const emscripten::val& resolveFunc, const std::string &str) {
      auto* lint = new QmlSourceLint(*this, resolveFunc, str.c_str());
      connect(lint, &QmlSourceLint::lintCompleted, this, &Controller::onLintCompleted);
      lint->start();
    }

    QQmlComponent* currentComponent() const {
      return m_component;
    }

    void setCurrentComponent(QQmlComponent* component) {
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

    QQmlComponent* lastLintComponent() const {
      return m_lint_component;
    }

protected Q_SLOTS:
    void onLintCompleted()
    {
      auto* lint = qobject_cast<QmlSourceLint*>(sender());

      if(!lint) {
        return;
      }

      if (lint->component()->status() == QQmlComponent::Ready) {
        setLastLintComponent(lint->component());
        notifyLintComponentIsReady();
      }

      lint->deleteLater();
    }

protected:
    void setLastLintComponent(QQmlComponent* component) {
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

    void createItem(QQmlComponent &component)
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

        notifyCurrentItemChange();
    }

private:
    QQuickView *m_view;
    QQmlComponent *m_lint_component = nullptr;
    QQmlComponent *m_component = nullptr;
    QQuickItem *m_item = nullptr;
};

static Controller *gController = nullptr;


QmlSourceLint::QmlSourceLint(Controller& controller, const emscripten::val& resolveFunc, const QByteArray& src)
    : QObject(&controller),
    m_controller(controller),
    m_resolve_func(resolveFunc),
    m_data(src),
    m_src(QString::fromUtf8(src))
{

}

void QmlSourceLint::start()
{
  m_component = new QQmlComponent(m_controller.engine(), this);
  connect(m_component,
          &QQmlComponent::statusChanged,
          this,
          &QmlSourceLint::onComponentStatusChanged);
  m_component->setData(m_data, QUrl());
}


extern "C" {

EMSCRIPTEN_KEEPALIVE void lint_source(const emscripten::val& resolveFunc, const std::string &str)
{
  if (gController) {
    gController->lintSource(resolveFunc, str);
  }
}

EMSCRIPTEN_KEEPALIVE void use_last_lint_as_source()
{
  if (!gController) {
    return;
  }

  if (gController->lastLintComponent()) {
    gController->setCurrentComponent(gController->lastLintComponent());
  }
}

} // extern "C"

EMSCRIPTEN_BINDINGS(my_module)
{
    emscripten::function("qmlfiddle_lintSource", &lint_source);
    emscripten::function("qmlfiddle_UseLastLintAsSource", &use_last_lint_as_source);
}

int main(int argc, char *argv[])
{
    QGuiApplication app(argc, argv);

    Q_INIT_RESOURCE(qmlfiddle);

    QQuickView view;
    view.setResizeMode(QQuickView::SizeRootObjectToView);
    view.setSource(QUrl("qrc:/qmlfiddle/main.qml"));
    view.show();

    gController = new Controller(view, &app);

    return app.exec();
}

#include "main.moc"
