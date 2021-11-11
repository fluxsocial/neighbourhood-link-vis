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
import { v4 as uuidv4 } from 'uuid';

export default {
  name: 'App',
  methods: {
    async load() {
      const [nodes, edges] = await this.getPerspectiveNodesAndMetaEdges();
      this.nodes = nodes;
      this.edges = edges;
    },
    async getPerspectiveNodesAndMetaEdges() {
      console.log("getPerspectiveNodesAndMetaEdges()");
      const perspectives = await ad4mClient.perspective.all();
      console.log(perspectives);
      let nodes = [];
      let edges = [];
      for (const perspective of perspectives) {
        const neighbourhoodLinks = perspective.neighbourhood.meta.links;
        const neighbourhoodLanguage = perspective.neighbourhood.linkLanguage;
        //Create perspective node
        const perspectiveData = {
          id: perspective.uuid,
          label: perspective.name + "Neighbourhood",
          widthConstraint: 100,
          shape: 'database'
        };
        //Create language node
        const neighbourhoodLanguageData = {
          id: neighbourhoodLanguage,
          label: neighbourhoodLanguage + " Link Language",
          widthConstraint: 100
        }
        nodes.push(perspectiveData);
        nodes.push(neighbourhoodLanguageData);
        const metaLinkNode = uuidv4();
        const metaLinks = {
          id: metaLinkNode,
          label: "metaLinks",
          shape: 'database'
        }
        nodes.push(metaLinks);
        edges.push({
          from: perspective.uuid,
          to: metaLinkNode,
          label: "metaLinks"
        })
        //Add the meta links to the network
        for (const metaLink of neighbourhoodLinks) {
          const link = metaLink.data;
          let edge = {}
          //Use unique edges here
          const id = uuidv4();
          //If source self then use from as perspective
          if (link.source == "self") {
            edge = {
              from: metaLinkNode,
              to: id,
              label: link.predicate
            } 
          } else {
            edge = {
              from: link.source,
              to: link.target,
              label: link.predicate
            }
          }
          //Add a node for target data
          //We always add a node here since we dont want perspectives to share link targets
          nodes.push({
            id: id,
            label: link.target,
            widthConstraint: 100
          })
          edges.push(edge)
        }
        //Now start to look for the actual links on the link language
        const linkLanguageLinksNode = uuidv4();
        const linkLanguageLinks = {
          id: linkLanguageLinksNode,
          label: "linkLanguageLinks",
          shape: 'database'
        }
        nodes.push(linkLanguageLinks);
        edges.push({
          from: perspective.uuid,
          to: linkLanguageLinksNode,
          label: "linkLanguageLinks"
        })
        // const links = await ad4mClient.perspective.queryLinks(perspective.uuid, {limit: 10});
        // console.log(links);
      }
      return [nodes, edges]
    }
  },
  data() {
    return {
      nodes: [],
      edges: [],
      options: {
        autoResize: true,
        nodes: {
          borderWidth: 1
        },
        edges: {
          color: 'grey',
          smooth: {
            type: "continous"
          }
        },
        physics: {
          barnesHut: {
            springConstant: 0,
            avoidOverlap: 0.2
          },
          enabled: true,
          hierarchicalRepulsion: {
              centralGravity: 0.0,
              springLength: 500,
              springConstant: 0.01,
              nodeDistance: 300,
              damping: 0.09
          },
          solver: 'hierarchicalRepulsion'
        },
        layout: {
          hierarchical: {
            direction: "UD",
            sortMethod: "directed",
            nodeSpacing: 150,
            treeSpacing: 100,
          }
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
