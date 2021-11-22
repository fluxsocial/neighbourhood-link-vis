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
    loadPerspectiveNode(perspective) {
      const perspectiveNode = {
        id: perspective.uuid,
        label: perspective.name + "-Perspective",
        widthConstraint: 100,
        shape: 'database'
      };
      return perspectiveNode;
    },
    loadNeighbourhoodNodes(perspective) {
      const nodes = [];
      const neighbourhoodLanguage = perspective.neighbourhood.linkLanguage;
      //Create perspective node
      const perspectiveNode = {
        id: perspective.uuid,
        label: perspective.name + "-Neighbourhood",
        widthConstraint: 100,
        shape: 'database'
      };
      //Create language node
      const neighbourhoodLanugageNode = {
        id: neighbourhoodLanguage,
        label: neighbourhoodLanguage,
        widthConstraint: 100
      }
      nodes.push(perspectiveNode);
      nodes.push(neighbourhoodLanugageNode);
      return [nodes, [{type: "perspective", id: perspective.uuid}, {type: "linkLanguage", id: neighbourhoodLanguage}]]
    },
    loadMetaLinks(perspective) {
      const neighbourhoodMetaLinks = perspective.neighbourhood.meta.links;
      const nodes = [];
      const edges = [];
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
      for (const metaLink of neighbourhoodMetaLinks) {
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

      return [nodes, edges, [{type: "metaLinksDatabase", id: metaLinkNode}]]
    },
    async loadLinkLanguageLinks(perspective) {
      const nodes = [];
      const edges = [];
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
      edges.push({
        from: linkLanguageLinksNode,
        to: perspective.neighbourhood.linkLanguage,
        label: "usesLanguage"
      })
      const links = await ad4mClient.perspective.queryLinks(perspective.uuid, {limit: 10});
      
      for (const link of links) {
        const linkData = link.data;
        console.log(linkData);
        const sourceNode = {
          id: linkData.source,
          label: linkData.source,
        }
        const targetNode = {
          id: linkData.target,
          label: linkData.target
        }
        if (nodes.filter(node => node.id === linkData.source).length == 0) { nodes.push(sourceNode) }
        if (nodes.filter(node => node.id === linkData.target).length == 0) { nodes.push(targetNode) }
        edges.push({
          from: linkLanguageLinksNode,
          to: linkData.source,
          label: "containsLink"
        })
        edges.push({
          from: linkData.source,
          to: linkData.target,
          label: linkData.predicate
        })
      }
      return [nodes, edges]
    },
    async getPerspectiveNodesAndMetaEdges() {
      console.log("getPerspectiveNodesAndMetaEdges()");
      const perspectives = await ad4mClient.perspective.all();
      console.log("Got perspectives: ", perspectives);
      let nodes = [];
      let edges = [];
      for (const perspective of perspectives) {
        if (perspective.neighbourhood) {
          //Load the neighbourhood data
          const [neighbourhoodNodes, nodeRefs] = this.loadNeighbourhoodNodes(perspective);
          //Load the meta data
          const [metaNodes, neighbourhoodEdges, metaNodeRefs] = this.loadMetaLinks(perspective);
          //Add nodes and edges to output
          nodes = nodes.concat(neighbourhoodNodes);
          nodes = nodes.concat(metaNodes);
          edges = edges.concat(neighbourhoodEdges);
          //Keep one array of node refs we might need later
          nodeRefs.concat(metaNodeRefs);

          const [linkNodes, linkEdges] = await this.loadLinkLanguageLinks(perspective);
          nodes = nodes.concat(linkNodes);
          edges = edges.concat(linkEdges);
        } else {
          const perspectiveNode = this.loadPerspectiveNode(perspective);
          nodes.push(perspectiveNode);
        }
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
          color: 'grey'
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
