export function parseCsv(input:string):string[][] {
 const separator = input.split(/\r?\n/,1)[0].includes(';') ? ';' : ',';
 const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false;
 for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===separator&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('CSV con comillas sin cerrar');row.push(cell);if(row.some(Boolean))rows.push(row);return rows;
}
export function mappedCsv(input:string,mapping:Record<string,string>) {const rows=parseCsv(input);const header=rows.shift()?.map(x=>x.trim().replace(/^\uFEFF/,''))??[];return rows.map(row=>Object.fromEntries(Object.entries(mapping).map(([target,source])=>[target,row[header.indexOf(source)]??''])));}
