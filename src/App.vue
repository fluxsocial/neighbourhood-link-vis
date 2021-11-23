<template>
<div id="app" >
  <h1>Ad4m Neighbourhood Link Viz</h1>
  <h4>Please ensure your ad4m agent is unlocked before loading. This application also expects ad4m graphql endpoint to be available at: ws://localhost:4000/graphql</h4>
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
      await this.getPerspectiveNodesAndMetaEdges();
    },
    loadPerspectiveNode(perspective) {
      const perspectiveNode = {
        id: perspective.uuid,
        label: perspective.name + "-Perspective",
        widthConstraint: 100,
        shape: 'database'
      };
      this.nodes.push(perspectiveNode);
    },
    loadNeighbourhoodNode(perspective) {
      const neighbourhoodLanguage = perspective.neighbourhood.linkLanguage;
      //Create perspective node
      const perspectiveNode = {
        id: perspective.sharedUrl,
        label: perspective.name + "-Neighbourhood",
        widthConstraint: 100,
        shape: 'database',
        color: "#FF0013"
      };
      //Create language node
      const neighbourhoodLanugageNode = {
        id: neighbourhoodLanguage,
        label: neighbourhoodLanguage,
        widthConstraint: 100
      }
      if (this.nodes.filter(node => node.id === perspective.sharedUrl).length == 0) this.nodes.push(perspectiveNode);
      this.nodes.push(neighbourhoodLanugageNode);
    },
    loadMetaLinks(perspective) {
      const neighbourhoodMetaLinks = perspective.neighbourhood.meta.links;
      const metaLinkNode = uuidv4();
      const metaLinks = {
        id: metaLinkNode,
        label: "metaLinks",
        shape: 'database',
        group: "metaLinks"
      }
      this.nodes.push(metaLinks);
      this.edges.push({
        from: perspective.sharedUrl,
        to: metaLinkNode,
        label: "metaLinks"
      })
      //Add the meta links to the network
      for (const metaLink of neighbourhoodMetaLinks) {
        const link = metaLink.data;
        const sourceId = uuidv4();
        this.nodes.push({
          id: sourceId,
          label: link.source,
          widthConstraint: 100,
          group: "metaLinks"
        })
        this.edges.push({
          from: metaLinkNode,
          to: sourceId,
          label: "containsLink"
        })
        //Add a node for target data
        //We always add a node here since we dont want perspectives to share link targets
        const targetId = uuidv4();
        this.nodes.push({
          id: targetId,
          label: link.target,
          widthConstraint: 100,
          group: "metaLinks"
        })
        this.edges.push({
          from: sourceId,
          to: targetId,
          label: link.predicate
        })
      }
    },
    async loadLinkLanguageLinks(perspective, isNeighbourhood) {
      //Now start to look for the actual links on the link language
      const linkLanguageLinksNode = uuidv4(); 
      if (isNeighbourhood) {
        const linkLanguageLinks = {
          id: linkLanguageLinksNode,
          label: "linkLanguageLinks",
          shape: 'database',
          group: "linkLanguageLink"
        }
        this.nodes.push(linkLanguageLinks);
        this.edges.push({
          from: perspective.sharedUrl,
          to: linkLanguageLinksNode,
          label: "linkLanguageLinks"
        })
        this.edges.push({
          from: linkLanguageLinksNode,
          to: perspective.neighbourhood.linkLanguage,
          label: "usesLanguage"
        })
      }
      const links = await ad4mClient.perspective.queryLinks(perspective.uuid, {limit: 10});
      
      let from;
      if (isNeighbourhood) {
        from = linkLanguageLinksNode
      } else {
        from = perspective.uuid;
      }

      for (const link of links) {
        const linkData = link.data;
        const sourceId = uuidv4();
        const targetId = uuidv4();
        const sourceNode = {
          id: sourceId,
          label: linkData.source,
          widthConstraint: 200,
          group: "linkLanguageLink"
        }
        let targetNode;
        let edge;
        if (linkData.target.includes("neighbourhood://")) {
          targetNode = {
            id: linkData.target,
            label: linkData.target,
            widthConstraint: 200,
            group: "linkLanguageLink"
          }
          edge = {
            from: sourceId,
            to: linkData.target,
            label: linkData.predicate,
          }
        } else {
          targetNode = {
            id: targetId,
            label: linkData.target,
            widthConstraint: 200,
            group: "linkLanguageLink"
          }
          edge = {
            from: sourceId,
            to: targetId,
            label: linkData.predicate,
          }
        }
        this.nodes.push(sourceNode)
        this.nodes.push(targetNode)
        this.edges.push({
          from: from,
          to: sourceId,
          label: "containsLink"
        })
        this.edges.push(edge)
      }
    },
    async getPerspectiveNodesAndMetaEdges() {
      console.log("getPerspectiveNodesAndMetaEdges()");
      const perspectives = await ad4mClient.perspective.all();
      console.log("Got perspectives: ", perspectives);
      for (const perspective of perspectives) {
        if (perspective.neighbourhood) {
          //Load the neighbourhood data
          this.loadNeighbourhoodNode(perspective);
          //Load the meta data
          this.loadMetaLinks(perspective);

          await this.loadLinkLanguageLinks(perspective, true);
        } else {
          this.loadPerspectiveNode(perspective);
          await this.loadLinkLanguageLinks(perspective, false);
        }
      }
      this.edges = this.edges.sort(() => Math.random() - 0.5);
      this.nodes = this.nodes.sort(() => Math.random() - 0.5);

      Number.prototype.pad = function(size) {

          var s = String(this);
          while (s.length < (size || 2)) {s = "0" + s;}
          return s;
      }

      var padsize = this.nodes.length.toString().length;

      this.nodes.forEach ( node => {

        node.key = this.nodes.indexOf(node).pad(padsize);

        var edge = this.edges.find(e => e.to == node.id);
        while (edge) {

          var parent = this.nodes.find(n => n.id == edge.from);
          if (parent) {

              node.key = "" + this.nodes.indexOf(parent).pad(padsize) + node.key;
          }

          edge = this.edges.find(e => e.to == parent.id);
        }
      });  

      this.nodes = this.nodes.sort( (a,b) => {
        if (a.key > b.key) return 1;
        if (a.key < b.key) return -1;
        return 0;
      });
    }
  },
  data() {
    return {
      nodes: [],
      edges: [],
      options: {
        groups: {
          linkLanguageLink: {color:{background:'#FF3366'}},
          metaLinks: {color:{background:'#33A1FF'}}
        },
        nodes: {
          borderWidth: 1
        },
        edges: {
          color: 'black'
        },
        physics: {
          hierarchicalRepulsion: {
            nodeDistance: 300,
            centralGravity: 0.0,
            springLength: 200,
            springConstant: 0.01,
            damping: 0.09
          },
          solver: 'hierarchicalRepulsion'
        },
        layout: {
          hierarchical: {
            enabled: true,
            levelSeparation: 350,
            nodeSpacing: 350,
            treeSpacing: 350,
            blockShifting: true,
            edgeMinimization: true,
            parentCentralization: false,
            direction: 'UD',        // UD, DU, LR, RL
            sortMethod: 'directed'   // hubsize, directed
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
