// Copyright (C) 2025 Vincent Chambrin
// This file is part of the 'qmlfiddle' project.
// For conditions of distribution and use, see copyright notice in LICENSE.

#include "preprocessor.h"

#include <QList>

SourcePreprocessor::SourcePreprocessor()
{

}

QByteArray SourcePreprocessor::preprocess(const QByteArray& text)
{
  QList<QByteArray> lines = text.split('\n');

  for(int i(0); i < lines.length(); ++i)
  {
    processLine(i+1, lines[i]);
  }

  return lines.join('\n');
}

const std::vector<SourcePreprocessor::Error>& SourcePreprocessor::getErrors() const
{
  return m_errors;
}

const std::vector<SourcePreprocessor::PragmaResource>& SourcePreprocessor::getResources() const
{
  return m_resources;
}

const std::vector<SourcePreprocessor::PragmaImport>& SourcePreprocessor::getImports() const
{
  return m_imports;
}

void commentPragma(QByteArray& text, int index)
{
  text[index] = '/';
  text[index+1] = '/';
}

void SourcePreprocessor::processLine(int lineNum, QByteArray& text)
{
  int i = 0;

  while(i < text.length() && QChar(text[i]).isSpace()) ++i;

  if (text.indexOf("pragma ", i) != i) {
    return;
  }

  const int j = i+7;
  int k = text.indexOf(':', i+7);

  if (k == -1) {
    return;
  }

  QByteArray name = text.mid(j, k-j).trimmed();

  if (name != "FetchResource" && name != "ImportFiddle")
  {
    return;
  }

  k = text.indexOf('"', k+1);
  const int l = text.indexOf('"', k+1);

  if (k == -1 || l == -1) {
    Error e;
    e.line = lineNum;
    e.message = QString("bad syntax for pragma");
    m_errors.push_back(e);
    return;
  }

  QByteArray value = text.mid(k+1, l - (k+1));

  if (name == "FetchResource")
  {
    PragmaResource res;
    res.line = lineNum;
    res.name = QString::fromUtf8(value);
    m_resources.push_back(res);
    commentPragma(text, i);
  }
  else if (name == "ImportFiddle")
  {
    QByteArrayList parts = value.split('@');

    if(parts.size() != 2) {
      Error e;
      e.line = lineNum;
      e.message = QString("bad syntax for pragma");
      m_errors.push_back(e);
      return;
    }

    PragmaImport res;
    res.line = lineNum;
    res.fiddleId = QString::fromUtf8(parts.at(1));
    res.componentName = QString::fromUtf8(parts.at(0));
    m_imports.push_back(res);
    commentPragma(text, i);
  }
}
