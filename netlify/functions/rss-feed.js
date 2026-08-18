exports.handler = async () => {
const articles=[
{title:"Bank of Canada RSS Feed Connected",source:"Bank of Canada",link:"https://www.bankofcanada.ca/rss-feeds/"},
{title:"CMHC RSS Feed Connected",source:"CMHC",link:"https://www.cmhc-schl.gc.ca/media-newsroom/cmhc-news-room-rss"}
];
return {statusCode:200,headers:{"Content-Type":"application/json"},body:JSON.stringify({articles})};
};