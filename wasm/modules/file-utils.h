// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#pragma once

#include <QObject>

class FileUtils : public QObject
{
  Q_OBJECT
public:
  explicit FileUtils(QObject* parent = nullptr);

  Q_INVOKABLE bool exists(const QString& filePath) const;

  Q_INVOKABLE QStringList readdir(const QString& dirPath) const;
};
