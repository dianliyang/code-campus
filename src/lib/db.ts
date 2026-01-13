import { exec } from 'child_process';
import { promisify } from 'util';
import { Course } from './scrapers/types';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export class D1Database {
  private dbName: string;

  constructor(dbName: string = "course-spider-db") {
    this.dbName = dbName;
  }

  async saveCourses(courses: Course[], batchSize: number = 50): Promise<void> {
    if (courses.length === 0) {
      console.log("No courses to save.");
      return;
    }

    const university = courses[0].university;
    console.log(`Saving ${courses.length} courses for ${university} to D1 database '${this.dbName}'...`);

    // Clear existing data first
    await this.clearUniversity(university);

    // Split into batches
    for (let i = 0; i < courses.length; i += batchSize) {
      const batch = courses.slice(i, i + batchSize);
      await this.insertBatch(batch, i, courses.length);
    }
  }

  async clearUniversity(university: string): Promise<void> {
    console.log(`Clearing existing courses for ${university}...`);
    const sql = `DELETE FROM courses WHERE university = ${this.escapeSQL(university)};`;
    
    const isRemote = process.env.REMOTE_DB === 'true';
    const flag = isRemote ? '--remote' : '--local';
    
    try {
      const { stdout, stderr } = await execAsync(`npx wrangler d1 execute ${this.dbName} --command="${sql}" ${flag}`);
    } catch (error) {
      console.error(`Error clearing university ${university}:`, error);
    }
  }

  private async insertBatch(courses: Course[], offset: number, total: number): Promise<void> {
    const values: string[] = [];
    
    for (const course of courses) {
      const university = this.escapeSQL(course.university);
      const courseCode = this.escapeSQL(course.course_code);
      const title = this.escapeSQL(course.title);
      const units = course.units ? this.escapeSQL(course.units) : "NULL";
      const description = course.description ? this.escapeSQL(course.description) : "NULL";
      const details = course.details ? this.escapeSQL(JSON.stringify(course.details)) : "NULL";
      
      values.push(`(${university}, ${courseCode}, ${title}, ${units}, ${description}, ${details})`);
    }

    const sql = `INSERT INTO courses (university, course_code, title, units, description, details) VALUES ${values.join(", ")};`;

    // Write SQL to a temporary file to avoid command line argument limits
    const tmpFileName = path.join(process.cwd(), `.tmp_insert_${Date.now()}.sql`);
    try {
      fs.writeFileSync(tmpFileName, sql);
      
      const isRemote = process.env.REMOTE_DB === 'true';
      const flag = isRemote ? '--remote' : '--local';
      
      const command = `npx wrangler d1 execute ${this.dbName} --file="${tmpFileName}" ${flag}`; 
      
      console.log(`Executing batch ${offset + 1}-${Math.min(offset + courses.length, total)} of ${total}...`);
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes("Compiling")) { // wrangler often outputs to stderr for info
         // console.warn("Wrangler stderr:", stderr); 
      }
    } catch (error) {
      console.error("Error inserting batch:", error);
    } finally {
      if (fs.existsSync(tmpFileName)) {
        fs.unlinkSync(tmpFileName);
      }
    }
  }

  private escapeSQL(str: string): string {
    if (typeof str !== 'string') return "NULL";
    // Basic single quote escaping
    return "'" + str.replace(/'/g, "''") + "'";
  }
}
