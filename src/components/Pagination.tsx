type PaginationItem=number|"ellipsis";

function pageItems(currentPage:number,totalPages:number):PaginationItem[]{
  if(totalPages<=7)return Array.from({length:totalPages},(_,index)=>index+1);
  const pages=new Set([1,totalPages,currentPage-2,currentPage-1,currentPage,currentPage+1,currentPage+2].filter(page=>page>=1&&page<=totalPages));
  const sorted=[...pages].sort((a,b)=>a-b);const items:PaginationItem[]=[];
  for(const page of sorted){const previous=items.at(-1);if(typeof previous==="number"&&page-previous>1)items.push("ellipsis");items.push(page)}
  return items;
}

export function Pagination({currentPage,totalPages,onPageChange,previousLabel,nextLabel,pageLabel}:{currentPage:number;totalPages:number;onPageChange:(page:number)=>void;previousLabel:string;nextLabel:string;pageLabel:string}){
  if(totalPages<=1)return null;
  return <nav className="pagination" aria-label={pageLabel}><button type="button" className="button secondary" onClick={()=>onPageChange(currentPage-1)} disabled={currentPage===1}>← {previousLabel}</button><div className="pagination-pages">{pageItems(currentPage,totalPages).map((item,index)=>item==="ellipsis"?<span key={`ellipsis-${index}`} aria-hidden="true">…</span>:<button type="button" key={item} className={item===currentPage?"active":""} onClick={()=>onPageChange(item)} aria-current={item===currentPage?"page":undefined} aria-label={`${pageLabel} ${item}`}>{item}</button>)}</div><button type="button" className="button secondary" onClick={()=>onPageChange(currentPage+1)} disabled={currentPage===totalPages}>{nextLabel} →</button></nav>;
}
