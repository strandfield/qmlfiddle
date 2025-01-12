// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#include "resources.h"

#include <QResource>

#include <emscripten/emscripten.h>

#include <algorithm>

constexpr const char* RESOURCE_FILE_EXTENSION = ".rcc";

static ResourceManager* gResourceManager = nullptr;

struct ResourceManager::Passkey {
  Passkey() = default;
  Passkey(const Passkey&) = default;
};

namespace
{

void onLoadFunc(const char* filename)
{
  gResourceManager->onLoad(filename, ResourceManager::Passkey());
}

void onErrorFunc(const char* filename)
{
  gResourceManager->onError(filename, ResourceManager::Passkey());
}

} // namespace


ResourceManager::ResourceManager(QObject* parent) : QObject(parent)
{

}


std::optional<ResourceManager::ResourceInfo> ResourceManager::getResourceInfo(const QString& name,  ResourceType type) const
{
  auto it = m_resourceMap.find(ResourceIdentifier(name, type));

  if (it == m_resourceMap.end())
  {
    return std::nullopt;
  }

  return *it;
}

void ResourceManager::fetchRcc(const QString& name)
{
  if (getResourceInfo(name, RccFile).has_value())
  {
    return;
  }

  const std::string url = "/" + std::string(RESOURCE_DIR) + "/" + name.toStdString() + RESOURCE_FILE_EXTENSION;
  const QString savepath = getRccSavePath(name);

  fetchResource(url, ResourceIdentifier(name, RccFile), savepath);
}

void ResourceManager::fetchQml(const QString& fiddleId)
{
  if (getResourceInfo(fiddleId, QmlFile).has_value())
  {
    return;
  }

  const std::string url = "/rawusercontent/" + fiddleId.toStdString();
  const QString savepath = getQmlSavePath(fiddleId);

  fetchResource(url, ResourceIdentifier(fiddleId, QmlFile), savepath);
}

QString ResourceManager::getQmlPath(const QString& fiddleId) const
{
  return getQmlSavePath(fiddleId);
}

void ResourceManager::fetchResource(const std::string& url, ResourceIdentifier resId, const QString& savePath)
{
  m_pendingFetchMap[savePath] = resId;

  ResourceInfo& info = m_resourceMap[resId];
  info.state = Loading;
  info.type = resId.second;

  gResourceManager = this;

  // TODO: use emscripten_async_wget_data() instead ?
  emscripten_async_wget(url.c_str(), savePath.toStdString().c_str(), onLoadFunc, onErrorFunc);
}

bool ResourceManager::isReady() const
{
  return std::all_of(m_resourceMap.begin(), m_resourceMap.end(), [](const ResourceInfo& info) {
    return info.state != ResourceState::Loading;
  });
}

QString ResourceManager::getRccSavePath(const QString& name) const
{
  return "/home/web_user/resources/" + name + RESOURCE_FILE_EXTENSION;
}

QString ResourceManager::getQmlSavePath(const QString& fiddleId) const
{
  return "/home/web_user/resources/" + fiddleId + ".qml";
}

void ResourceManager::onLoad(const char* filename, Passkey)
{
  const QString savepath{filename};

  auto it = m_pendingFetchMap.constFind(savepath);
  const ResourceIdentifier resid = *it;
  m_pendingFetchMap.erase(it);

  m_resourceMap[resid].state = Loaded;

  if (m_resourceMap[resid].type == RccFile)
  {
    bool success = QResource::registerResource(savepath);

    if(!success)
    {
      qDebug() << "failed to register resource " << savepath;
    }
  }

  if (isReady())
  {
    emit ready();
  }
}

void ResourceManager::onError(const char* filename, Passkey)
{
  const QString savepath{filename};

  auto it = m_pendingFetchMap.constFind(savepath);
  const ResourceIdentifier resid = *it;
  m_pendingFetchMap.erase(it);

  m_resourceMap[resid].state = NotFound;

  if (isReady())
  {
    emit ready();
  }
}
