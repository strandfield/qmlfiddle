// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#include "qml-fiddle.h"

constexpr const char* DEFAULT_BG_COLOR = "#cccccc";

QmlFiddle::QmlFiddle(QObject* parent): QObject(parent), m_backgroundColor(DEFAULT_BG_COLOR)
{

}

const QColor& QmlFiddle::backgroundColor() const
{
  return m_backgroundColor;
}

void QmlFiddle::setBackgroundColor(const QColor& color)
{
  if (m_backgroundColor != color)
  {
    m_backgroundColor = color;
    Q_EMIT backgroundColorChanged(m_backgroundColor);
  }
}

void QmlFiddle::resetBackgroundColor()
{
  setBackgroundColor(QColor(DEFAULT_BG_COLOR));
}
