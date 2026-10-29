// 1. ዩዘር ፕሮፋይል ለመፍጠር ከፍሮንተንድ (Frontend) የሚላክ ኮድ ምሳሌ:
async function createUser() {
  try {
    const response = await fetch("https://azbingoapi.fra.appwrite.run/createUserProfile", {
      method: "POST", // አፕራይት ላይ በ POST መልክ ነው የሚላከው
      headers: {
        "Content-Type": "application/json",
        "x-appwrite-user-id": "የተጠቃሚው_መለያ_UID" // ከተጠቃሚው አውትኬኬሽን የሚመጣ ID
      },
      body: JSON.stringify({}) // የሚያስፈልግ ዳታ ካለ እዚህ ይገባል
    });

    const data = await response.json();
    console.log("Response:", data); // ውጤቱ { ok: true } ብሎ ይመጣል
  } catch (error) {
    console.error("Error:", error);
  }
}
