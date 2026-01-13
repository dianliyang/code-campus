import { queryD1 } from '../lib/d1';

async function main() {
  console.log("Checking DB distribution...");
  const counts = await queryD1('SELECT university, count(*) as count FROM courses GROUP BY university');
  console.log(JSON.stringify(counts, null, 2));

  console.log("Checking sample Stanford course...");
  const stanford = await queryD1('SELECT * FROM courses WHERE university = ? LIMIT 1', ['stanford']);
  console.log(JSON.stringify(stanford, null, 2));
}

main();
