import type { MetadataRoute } from "next";

export default function manifest():MetadataRoute.Manifest{
  return{
    name:"Bravómetro",
    short_name:"Bravómetro",
    description:"Encuentra y valora las mejores patatas bravas.",
    start_url:"/es",
    scope:"/",
    display:"standalone",
    background_color:"#fffaf0",
    theme_color:"#d83b19",
    orientation:"portrait-primary",
    icons:[
      {src:"/assets/app-icon-192.png",sizes:"192x192",type:"image/png"},
      {src:"/assets/app-icon-512.png",sizes:"512x512",type:"image/png"},
      {src:"/assets/app-icon-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"},
    ],
  };
}
