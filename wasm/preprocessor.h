// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#pragma once

#include <QByteArray>
#include <QString>

#include <vector>

class SourcePreprocessor
{
public:
  SourcePreprocessor();

  QByteArray preprocess(const QByteArray& text);

  struct Error
  {
    int line;
    QString message;
  };

  const std::vector<Error>& getErrors() const;

  struct PragmaResource
  {
    int line;
    QString name;
  };

  const std::vector<PragmaResource>& getResources() const;

protected:
  void processLine(int lineNum, QByteArray& text);

private:
  std::vector<Error> m_errors;
  std::vector<PragmaResource> m_resources;
};
