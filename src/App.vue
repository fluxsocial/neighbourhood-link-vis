<template>
<div id="app" >
  <h1>Ad4m Neighbourhood Link Viz</h1>
  <button @click="load">Load</button>
  <network ref="network" class="wrapper" 
  :nodes="nodes"
  :edges="edges"
  :options="options">
  </network>
</div>
</template>

<script>
import "vue-vis-network/node_modules/vis-network/dist/vis-network.css";
import { ad4mClient } from "./main";

export default {
  name: 'App',
  methods: {
    async load() {
      this.nodes = await this.getNodes();
    },
    async getNodes() {
      console.log("getNodes()");
      const perspectives = await ad4mClient.perspective.all();
      console.log(perspectives);
      return perspectives.map((perspective) => {
        console.log(perspective);
        return {
          id: perspective.uuid,
          label: perspective.name,
        }
      })
    }
  },
  data() {
    return {
      nodes: [],
      edges: [],
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
