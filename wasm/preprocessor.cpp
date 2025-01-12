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


void commentPragma(QByteArray& text, int index)
{
  text[index] = '/';
  text[index+1] = '/';
}

void SourcePreprocessor::processLine(int lineNum, QByteArray& text)
{
  int i = 0;

  while(i < text.length() && QChar(text[i]).isSpace()) ++i;

  if (i == text.length() || text[i] != '#') {
    return;
  }

  if (text.indexOf("#pragma", i) != i) {
    return;
  }

  QList<QByteArray> parts = text.mid(i + 8).simplified().split(' ');
  parts.removeAll(QByteArray(""));

  if (parts.size() != 2)
  {
    Error e;
    e.line = lineNum;
    e.message = QString("could not parse pragma");
    m_errors.push_back(e);
    return;
  }

  if (parts.at(0) == "resource")
  {
    PragmaResource res;
    res.line = lineNum;
    res.name = QString::fromUtf8(parts.at(1));
    m_resources.push_back(res);
    commentPragma(text, i);
  }
  else
  {
    Error e;
    e.line = lineNum;
    e.message = QString("unknown pragma '%1'").arg(QString::fromUtf8(parts.at(0)));
    m_errors.push_back(e);
    return;
  }
}
