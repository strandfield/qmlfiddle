// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#pragma once

#include <QObject>

#include <QColor>

class QmlFiddle : public QObject
{
  Q_OBJECT
  Q_PROPERTY(QColor backgroundColor READ backgroundColor WRITE setBackgroundColor NOTIFY backgroundColorChanged)
public:
  explicit QmlFiddle(QObject* parent = nullptr);

  const QColor&backgroundColor() const;
  void setBackgroundColor(const QColor& color);
  Q_INVOKABLE void resetBackgroundColor();

Q_SIGNALS:
  void backgroundColorChanged(const QColor&);

private:
  QColor m_backgroundColor;
};
