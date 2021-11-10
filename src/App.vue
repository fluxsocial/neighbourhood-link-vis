<template>
<div id="app" >
  <h1>Ad4m Neighbourhood Link Viz</h1>
  <network ref="network" class="wrapper" 
  :nodes="nodes"
  :edges="edges"
  :options="options">
  </network>
</div>
</template>

<script>
import "vue-vis-network/node_modules/vis-network/dist/vis-network.css";

export default {
  name: 'App',
  data() {
    return {
      nodes: [
        {id: 1,  label: 'circle'},
        {id: 2,  label: 'ellipse'},
        {id: 3,  label: 'database'},
        {id: 4,  label: 'box'},
        {id: 5,  label: 'diamond'},
        {id: 6,  label: 'dot'},
        {id: 7,  label: 'square'},
        {id: 8,  label: 'triangle'},
      ],
      edges: [
        {from: 1, to: 2},
        {from: 2, to: 3},
        {from: 2, to: 4},
        {from: 2, to: 5}, 
        {from: 5, to: 6},
        {from: 5, to: 7},
        {from: 6, to: 8}
      ],
      options: {
         nodes: {
          borderWidth: 4
         },
         edges: {
          color: 'lightgray'
        }
      }
    }
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  width: 100%;
  height: 100%;
}
.wrapper{
  min-height: 100vh;
  border: 1px solid black;
  background-color: #ccc;
  padding: 10px;
  height: 100vh;
}
</style>
