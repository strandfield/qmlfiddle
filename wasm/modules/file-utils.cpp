// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#include "file-utils.h"

#include <QDir>
#include <QFile>

FileUtils::FileUtils(QObject* parent)
    : QObject(parent)
{

}

bool FileUtils::exists(const QString& filePath) const
{
  return QFile::exists(filePath);
}

QStringList FileUtils::readdir(const QString& dirPath) const
{
  return QDir(dirPath).entryList(QDir::Files | QDir::Dirs | QDir::NoDotAndDotDot);
}
