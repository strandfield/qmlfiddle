// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#pragma once

#include <QObject>

#include <QMap>

#include <optional>

class ResourceManager : public QObject
{
  Q_OBJECT
public:
  ResourceManager(QObject* parent = nullptr);

  enum ResourceState
  {
    NotFound,
    Loading,
    Loaded,
  };

  std::optional<ResourceState> getResourceInfo(const QString& name) const;
  void fetchResource(const QString& name);

  bool isReady() const;

public: // public, but with restricted access
  struct Passkey;
  void onLoad(const char* filename, Passkey);
  void onError(const char* filename, Passkey);

Q_SIGNALS:
  void ready();

private:
  QString getResourceFilePath(const QString& name) const;

private:
  QMap<QString, ResourceState> m_resourceMap;
};
