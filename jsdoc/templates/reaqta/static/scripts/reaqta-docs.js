(function () {
  window.addEventListener('load', () => {
    setupCollabsibleNav()
  })

  function setupCollabsibleNav() {
    const resources = document.querySelectorAll('nav .rqt-resource')
    Array.prototype.forEach.call(resources, (res) => {
      res.addEventListener('click', (e) => {
        e.target.parentNode.classList.toggle('show')
      })
    })
  }
})()
