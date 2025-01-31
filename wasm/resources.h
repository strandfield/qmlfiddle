// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#pragma once

#include <QObject>

#include <QMap>
#include <QString>

#include <optional>
#include <utility> // for std::pair

class ResourceManager : public QObject
{
  Q_OBJECT
public:
  ResourceManager(QObject* parent = nullptr);

  enum ResourceType
  {
    RccFile,
    QmlFile,
  };

  enum ResourceState
  {
    NotFound,
    Loading,
    Loaded,
  };

  struct ResourceInfo
  {
    ResourceState state = NotFound;
    ResourceType type;
  };

  using ResourceIdentifier = std::pair<QString, ResourceType>;

  std::optional<ResourceInfo> getResourceInfo(const QString& name, ResourceType type = RccFile) const;
  void fetchRcc(const QString& name);
  void fetchQml(const QString& fiddleId);

  QString getQmlPath(const QString& fiddleId) const;

  bool isReady() const;

public: // public, but with restricted access
  struct Passkey;
  void onLoad(const char* filename, Passkey);
  void onError(const char* filename, Passkey);

Q_SIGNALS:
  void ready();

private:
  QString getRccSavePath(const QString& name) const;
  QString getQmlSavePath(const QString& fiddleId) const;
  void fetchResource(const std::string& url, ResourceIdentifier resId, const QString& savePath);

private:
  QMap<ResourceIdentifier, ResourceInfo> m_resourceMap;
  QMap<QString, ResourceIdentifier> m_pendingFetchMap;
};
