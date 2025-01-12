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


std::optional<ResourceManager::ResourceState> ResourceManager::getResourceInfo(const QString& name) const
{
  auto it = m_resourceMap.find(getResourceFilePath(name));

  if (it == m_resourceMap.end())
  {
    return std::nullopt;
  }

  return *it;
}

void ResourceManager::fetchResource(const QString& name)
{
  if (getResourceInfo(name).has_value())
  {
    return;
  }

  std::string path = "/" + std::string(RESOURCE_DIR) + "/" + name.toStdString() + RESOURCE_FILE_EXTENSION;
  QString savepath = getResourceFilePath(name);

  m_resourceMap[savepath] = Loading;

  gResourceManager = this;

  // TODO: use emscripten_async_wget_data() instead ?
  emscripten_async_wget(path.c_str(), savepath.toStdString().c_str(), onLoadFunc, onErrorFunc);
}

bool ResourceManager::isReady() const
{
  return std::all_of(m_resourceMap.begin(), m_resourceMap.end(), [](ResourceState s) {
    return s != ResourceState::Loading;
  });
}

QString ResourceManager::getResourceFilePath(const QString& name) const
{
  return "/home/web_user/resources/" + name + RESOURCE_FILE_EXTENSION;
}

void ResourceManager::onLoad(const char* filename, Passkey)
{
  QString path{filename};
  m_resourceMap[path] = Loaded;

  bool success = QResource::registerResource(path);

  if(!success)
  {
    qDebug() << "failed to register resource " << path;
  }

  if (isReady())
  {
    emit ready();
  }
}

void ResourceManager::onError(const char* filename, Passkey)
{
  QString path{filename};
  m_resourceMap[path] = NotFound;

  if (isReady())
  {
    emit ready();
  }
}
