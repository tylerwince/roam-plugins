// This will get all pages in the graph and return them as a string in an array
function getAllPages() {
    pageObjs = window.roamAlphaAPI.q('[:find ?e :where [?e :node/title] ]');
    var pageNames = []
    for (i = 0; i < pageObjs.length; i++) {
        pageNames.push(window.roamAlphaAPI.pull('[:node/title]', pageObjs[i][0])[":node/title"]);
    }
    return pageNames
}

function lookForMatchingBlocks(blocks, pages) {
    for (i = 0; i < blocks.length; i++) {
        // all blocks only have 1 top level child node, a span.
        // skip to the second level of children
        for (j = 0; j < blocks[i].childNodes[0].childNodes.length; j++) {
            node = blocks[i].childNodes[0].childNodes[j];
            if (node.nodeType == 3) { // only text, no more childrens
                if (addUnderlineSpanWrapper(node, pages) == true) {
                    return true
                }
                continue
            }
            if (node.nodeType == 1) { // element node type, need to dig deeper
                // these are already linked, skip
                if (node.hasAttribute("data-link-title")
                    || node.hasAttribute("data-tag")
                    || node.hasAttribute("recommend")) {
                    continue
                }
                if (node.hasChildNodes()) {
                    for (k = 0; k < node.childNodes.length; k++) {
                        if (node.childNodes[k].nodeType == 3) { // only text, no more childrens
                            if (addUnderlineSpanWrapper(node.childNodes[k])) {
                                return true
                            }
                            continue
                        }
                        if (node.nodeType == 1) { // element node type, need to dig deeper
                            // these are already linked, skip
                            if (node.childNodes[k].hasAttribute("data-link-title")
                                || node.childNodes[k].hasAttribute("data-tag")
                                || node.childNodes[k].hasAttribute("recommend")) {
                                continue
                            }
                        }
                    }
                }
            }
        }
    }
    return false
}

function traceBlocksOnPage() {
    // blocks on the page where the button is clicked
    // get all pages in the graph
    let pages = getAllPages();
    matchFound = false

    do {
        let blocks = document.getElementsByClassName("roam-block");
        matchFound = lookForMatchingBlocks(blocks, pages)
    } while (matchFound == true)
}

function addUnderlineSpanWrapper(node, pages) {
    console.log(node)
    try {

        for (l = 0; l < pages.length; l++) {
            if (node.textContent.includes(pages[l])) {
                // iterate over the childNodes and do stuff on childNodes that 
                // don't have the data-link-title attribute
                start = node.textContent.indexOf(pages[l])
                end = node.textContent.indexOf(pages[l]) + pages[l].length
                beforeLinkText = node.textContent.slice(0, start)
                afterLinkText = node.textContent.slice(end)
                // truncate existing text node
                node.textContent = beforeLinkText
                // create span with page name
                matchSpan = document.createElement("span")
                matchSpan.setAttribute("recommend", "underline")
                matchSpan.classList.add("underline")
                matchSpan.innerText = pages[l]
                // add that span after the text node
                node.parentNode.insertBefore(matchSpan, node.nextSibling)
                // create a text node with the remainder text
                remainderText = document.createTextNode(afterLinkText)
                // add that remainder text after inserted node
                node.parentNode.insertBefore(remainderText, node.nextSibling.nextSibling)
                return true
            }
        }
    }
    catch (err) {
        return false
    }
    return false
}
  
function createButton() {
      var spanOne = document.createElement('span');
      spanOne.classList.add('bp3-popover-wrapper');
      var spanTwo = document.createElement('span');
      spanTwo.classList.add('bp3-popover-target');
      spanOne.appendChild(spanTwo);
      var outboundUnlinkedRefs = document.createElement('span');
      outboundUnlinkedRefs.id = 'outboundUnlinkedRefs';
      outboundUnlinkedRefs.classList.add('bp3-icon-search-around', 'bp3-button', 'bp3-minimal');
      spanTwo.appendChild(outboundUnlinkedRefs);
      var roamTopbar = document.getElementsByClassName("roam-topbar");
      roamTopbar[0].childNodes[0].appendChild(spanOne);
      outboundUnlinkedRefs.onclick = traceBlocksOnPage;
}
  
createButton()
