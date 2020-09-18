import Demo from './Demo.svelte'

// wire-in query params
// let user = ''
// const URLSearchParams = window.URLSearchParams
// if (typeof URLSearchParams !== undefined) {
//   const urlParams = new URLSearchParams(window.location.search)
//   const myParam = urlParams.get('user')
//   if (myParam) {
//     user = myParam
//   }
// }

const app = new Demo({
  target: document.body
  // props: { user: user }
})

export default app
