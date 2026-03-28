document.querySelectorAll(".logout-btn").forEach(button => {
  button.addEventListener("click", async () => {
    try {
      const res = await fetch("/logout", {
        method: "POST",
      });

      if (res.ok) {
        window.location.href = "/";
      }
    } catch (err) {
      console.error(err);
    }
  });
});