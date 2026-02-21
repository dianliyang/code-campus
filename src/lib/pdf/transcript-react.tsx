import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

import type { TranscriptRow } from "./transcript";

interface TranscriptPdfInput {
  title: string;
  rows: TranscriptRow[];
  generatedBy: string;
  universityFilter: string;
  semesterFilter: string;
}

interface NormalizedRow {
  no: string;
  code: string;
  title: string;
  university: string;
  credit: string;
  gpa: string;
  score: string;
  semester: string;
  completed: string;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 26,
    paddingHorizontal: 24,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: "center",
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 9,
    textAlign: "center",
    color: "#6B7280",
  },
  metaGrid: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 3,
    padding: 6,
    rowGap: 3,
  },
  metaRow: {
    flexDirection: "row",
  },
  metaLabel: {
    width: 88,
    fontWeight: 700,
    color: "#374151",
  },
  metaValue: {
    flex: 1,
    color: "#111827",
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 3,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    minHeight: 20,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    minHeight: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  colNo: { width: "5%" },
  colCode: { width: "10%" },
  colCourse: { width: "24%" },
  colUni: { width: "12%" },
  colCred: { width: "7%" },
  colGpa: { width: "7%" },
  colScore: { width: "9%" },
  colSem: { width: "16%" },
  colDone: { width: "10%" },
  cell: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    fontSize: 8,
  },
  headerCellText: {
    fontSize: 8,
    fontWeight: 700,
  },
  bodyCellText: {
    fontSize: 8,
    lineHeight: 1.25,
  },
  right: {
    textAlign: "right",
  },
  footer: {
    marginTop: 8,
    fontSize: 7.5,
    color: "#6B7280",
  },
});

function formatDate(value?: string): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US");
}

function averageScore(rows: TranscriptRow[]): string {
  const withScore = rows.filter((r) => typeof r.score === "number");
  if (withScore.length === 0) return "-";
  const avg = withScore.reduce((sum, row) => sum + (row.score || 0), 0) / withScore.length;
  return avg.toFixed(2);
}

function normalizeRows(rows: TranscriptRow[]): NormalizedRow[] {
  return rows.map((row, idx) => ({
    no: String(idx + 1),
    code: row.courseCode || "-",
    title: row.title || "-",
    university: row.university || "-",
    credit: row.credit !== undefined ? String(row.credit) : "-",
    gpa: row.gpa !== undefined ? row.gpa.toFixed(2) : "-",
    score: row.score !== undefined ? `${row.score.toFixed(1)}%` : "-",
    semester: (row.semesters || []).join(", ") || "-",
    completed: formatDate(row.completionDate),
  }));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks.length ? chunks : [[]];
}

function HeaderRow() {
  return (
    <View style={styles.tableHeader}>
      <View style={[styles.cell, styles.colNo]}><Text style={styles.headerCellText}>#</Text></View>
      <View style={[styles.cell, styles.colCode]}><Text style={styles.headerCellText}>Code</Text></View>
      <View style={[styles.cell, styles.colCourse]}><Text style={styles.headerCellText}>Course</Text></View>
      <View style={[styles.cell, styles.colUni]}><Text style={styles.headerCellText}>University</Text></View>
      <View style={[styles.cell, styles.colCred]}><Text style={[styles.headerCellText, styles.right]}>Cred</Text></View>
      <View style={[styles.cell, styles.colGpa]}><Text style={[styles.headerCellText, styles.right]}>GPA</Text></View>
      <View style={[styles.cell, styles.colScore]}><Text style={[styles.headerCellText, styles.right]}>Score</Text></View>
      <View style={[styles.cell, styles.colSem]}><Text style={styles.headerCellText}>Semester</Text></View>
      <View style={[styles.cell, styles.colDone, { borderRightWidth: 0 }]}><Text style={styles.headerCellText}>Completed</Text></View>
    </View>
  );
}

function DataRow({ row, isLast }: { row: NormalizedRow; isLast: boolean }) {
  const rowStyle = isLast ? [styles.row, { borderBottomWidth: 0 }] : styles.row;
  return (
    <View style={rowStyle}>
      <View style={[styles.cell, styles.colNo]}><Text style={styles.bodyCellText}>{row.no}</Text></View>
      <View style={[styles.cell, styles.colCode]}><Text style={styles.bodyCellText}>{row.code}</Text></View>
      <View style={[styles.cell, styles.colCourse]}><Text style={styles.bodyCellText}>{row.title}</Text></View>
      <View style={[styles.cell, styles.colUni]}><Text style={styles.bodyCellText}>{row.university}</Text></View>
      <View style={[styles.cell, styles.colCred]}><Text style={[styles.bodyCellText, styles.right]}>{row.credit}</Text></View>
      <View style={[styles.cell, styles.colGpa]}><Text style={[styles.bodyCellText, styles.right]}>{row.gpa}</Text></View>
      <View style={[styles.cell, styles.colScore]}><Text style={[styles.bodyCellText, styles.right]}>{row.score}</Text></View>
      <View style={[styles.cell, styles.colSem]}><Text style={styles.bodyCellText}>{row.semester}</Text></View>
      <View style={[styles.cell, styles.colDone, { borderRightWidth: 0 }]}><Text style={styles.bodyCellText}>{row.completed}</Text></View>
    </View>
  );
}

function TranscriptPdf({ input }: { input: TranscriptPdfInput }) {
  const rows = normalizeRows(input.rows);
  const rowChunks = chunk(rows, 24);
  const now = new Date().toLocaleString("en-US");
  const avgScore = averageScore(input.rows);

  return (
    <Document>
      {rowChunks.map((rowsOnPage, pageIndex) => (
        <Page key={`page-${pageIndex}`} size="A4" style={styles.page}>
          {pageIndex === 0 && (
            <>
              <Text style={styles.headerTitle}>Academic Transcript</Text>
              <Text style={styles.headerSubtitle}>CodeCampus Export</Text>
              <View style={styles.metaGrid}>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Title:</Text><Text style={styles.metaValue}>{input.title}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>University:</Text><Text style={styles.metaValue}>{input.universityFilter}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Semester:</Text><Text style={styles.metaValue}>{input.semesterFilter}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Generated:</Text><Text style={styles.metaValue}>{now}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Generated by:</Text><Text style={styles.metaValue}>{input.generatedBy}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Records:</Text><Text style={styles.metaValue}>{String(input.rows.length)}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Avg Score:</Text><Text style={styles.metaValue}>{avgScore}</Text></View>
              </View>
            </>
          )}

          <View style={styles.table}>
            <HeaderRow />
            {rowsOnPage.map((row, idx) => (
              <DataRow key={`${row.no}-${idx}`} row={row} isLast={idx === rowsOnPage.length - 1} />
            ))}
          </View>

          <Text style={styles.footer}>
            This document is generated by CodeCampus for personal academic tracking.
          </Text>
        </Page>
      ))}
    </Document>
  );
}

export async function generateTranscriptPdfWithReact(input: TranscriptPdfInput): Promise<Buffer> {
  return renderToBuffer(<TranscriptPdf input={input} />);
}
