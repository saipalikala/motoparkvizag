const updateNavbar = async ()=>{

await fetch("http://localhost:5000/api/navbar",{
method:"PUT",
headers:{ "Content-Type":"application/json" },
body: JSON.stringify(navbarData)
})

}