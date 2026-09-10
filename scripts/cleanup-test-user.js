const fs = require('fs'), path = require('path'), mysql = require('mysql2/promise')
function loadEnv(f){const o={};for(const raw of fs.readFileSync(f,'utf8').split(/\r?\n/)){const l=raw.trim();const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)o[m[1]]=m[2].trim();}return o;}
const e=loadEnv(path.join(__dirname,'..','.env.local'));
(async()=>{const db=await mysql.createPool({host:e.DATABASE_HOST,port:Number(e.DATABASE_PORT),user:e.DATABASE_USER,password:e.DATABASE_PASSWORD,database:e.DATABASE_NAME,ssl:{minVersion:'TLSv1.2',rejectUnauthorized:true}});
const email='manual-test@example.com';
const [u]=await db.execute('SELECT id FROM users WHERE email=?',[email]);
if(u.length){const id=u[0].id;
 for(const t of ['categories','wallets','transactions','debts','vaults','sessions','accounts'])
   await db.execute(`DELETE FROM ${t} WHERE userId=?`,[id]).catch(()=>{});
 await db.execute('DELETE FROM users WHERE id=?',[id]);
 console.log('removed test user '+email);
} else console.log('test user not present');
await db.end();})()
