// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#pragma once

#include <QByteArray>

#include <vector>

class SourcePreprocessor
{
public:
  SourcePreprocessor();

  QByteArray preprocess(const QByteArray& text);

  struct PragmaResource
  {
    int line;
    QByteArray name;
  };

  const std::vector<PragmaResource>& getResources() const;

protected:
  void processLine(int lineNum, QByteArray& text);

private:
  std::vector<PragmaResource> m_resources;
};
