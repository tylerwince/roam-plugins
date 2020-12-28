// This will get all pages in the graph and return them as a string in an array
function getAllPages() {
    pageObjs = window.roamAlphaAPI.q('[:find ?e :where [?e :node/title] ]');
    var pageNames = []
    for (i = 0; i < pageObjs.length; i++) {
        pageNames.push(window.roamAlphaAPI.pull('[:node/title]', pageObjs[i][0])[":node/title"]);
    }
    return pageNames
}

function pageTaggedInParent(node, page) {
    parent = node.parentElement
    while (parent.classList.contains("roam-article") == false) {
        parent = parent.parentElement
        if (parent.hasAttribute("data-page-links")) {
            linkedPages = JSON.parse(parent.getAttribute("data-page-links"))
            if (linkedPages.includes(page)) {
                return true
            }
        }
    }
    return false
}

function findTargetNodes(blocks, pages) {
    for (i = 0; i < blocks.length; i++) {
        // all blocks only have 1 top level child node, a span.
        // skip to the second level of children
        for (j = 0; j < blocks[i].childNodes[0].childNodes.length; j++) {
            node = blocks[i].childNodes[0].childNodes[j];
            if (node.nodeType == 3) { // only text, no more childrens
                if (spanWrapper(node, pages) == true) {
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
                            if (spanWrapper(node.childNodes[k])) {
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

function unlinkFinder() {
    if (document.title == "roam/js") {
      console.log("DON'T DO IT ON THIS PAGE")
      return
    }
    // blocks on the page where the button is clicked
    // get all pages in the graph
    let pages = getAllPages();
    matchFound = false

    do {
        let blocks = document.getElementsByClassName("roam-block");
        matchFound = findTargetNodes(blocks, pages)
    } while (matchFound == true)
}

function spanWrapper(node, pages) {
    try {
        for (l = 0; l < pages.length; l++) {
            if (node.textContent.toLowerCase().includes(pages[l].toLowerCase())) {
                // iterate over the childNodes and do stuff on childNodes that 
                // don't have the data-link-title attribute
                start = node.textContent.toLowerCase().indexOf(pages[l].toLowerCase())
                end = start + pages[l].length
                beforeLinkText = node.textContent.slice(0, start)
                firstCharBeforeMatch = node.textContent.slice(start - 1)[0]
                firstCharAfterMatch = node.textContent.slice(start).substr(pages[l].length)[0]
                linkText = node.textContent.slice(start, end)
                afterLinkText = node.textContent.slice(end)
                // create span with page name
                matchSpan = document.createElement("span")
              	matchSpan.classList.add("unlink-finder")
                matchSpan.style.cssText += "text-decoration: underline; text-decoration-style: dotted;"
                matchSpan.classList.add("exact-word-match")
                matchSpan.setAttribute("recommend", "underline")
                if (linkText != pages[l]) {
                    matchSpan.classList.add("fuzzy-word-match")
                    matchSpan.classList.remove("exact-word-match")
                    matchSpan.style.cssText += "text-decoration-color: gray;"
                }
                if ((firstCharAfterMatch != " " && end != node.textContent.length) || (firstCharBeforeMatch != " " && start != 0)) {
                    matchSpan.classList.add("partial-word-match")
                    matchSpan.classList.remove("exact-word-match")
                  matchSpan.style.cssText += "text-decoration-color: lightgray;"
                }
                if (pageTaggedInParent(node, pages[l]) == true) {
                    matchSpan.classList.add("redundant-word-match")
                    matchSpan.classList.remove("exact-word-match")
                    matchSpan.style.cssText += "text-decoration-color: transparent;";
                }
                matchSpan.innerText = linkText
                // truncate existing text node
                node.textContent = beforeLinkText
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
        console.log(err)
        return false
    }
    return false
}

function unlinkFinderButton() {
      var spanOne = document.createElement('span');
      spanOne.classList.add('bp3-popover-wrapper');
      spanOne.setAttribute("style", "margin-left: 4px;")
      var spanTwo = document.createElement('span');
      spanTwo.classList.add('bp3-popover-target');
      spanOne.appendChild(spanTwo);
      var unlinkFinderIcon = document.createElement('span');
      unlinkFinderIcon.id = 'unlinkFinderIcon';
      unlinkFinderIcon.classList.add('bp3-icon-search-around', 'bp3-button', 'bp3-minimal', 'bp3-small');
      spanTwo.appendChild(unlinkFinderIcon);
      var roamTopbar = document.getElementsByClassName("roam-topbar");
      roamTopbar[0].childNodes[0].appendChild(spanOne);
      unlinkFinderIcon.onclick = unlinkFinder;
}
unlinkFinderButton()
