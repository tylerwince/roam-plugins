function getAllPages() {
    pageObjs = window.roamAlphaAPI.q('[:find ?e :where [?e :node/title] ]');
    var pageNames = [];
    for (i = 0; i < pageObjs.length; i++) {
        pageNames.push(window.roamAlphaAPI.pull('[:node/title]', pageObjs[i][0])[":node/title"]);
    }
    pageNames.sort(function (a, b) {
        return b.length - a.length;
    });
    return pageNames;
};

function removeUnlinkSpans(el) {
    for (i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType == 1 && el.childNodes[i].classList.contains("unlink-finder")) {
            el.childNodes[i].insertAdjacentText("afterend", el.childNodes[i].innerText)
            el.childNodes[i].remove()
        }
    }
    el.normalize()
}

function getAllAliases() {
    aliasMap = new Map();

    // This function is handpicked from David Vargas' roam-client.
    // It is used to grab configuration from a Roam page. 
    // You can find the whole library here: https://github.com/dvargas92495/roam-client
    var pagesWithAliases = window.roamAlphaAPI
        .q(
            `[:find (pull ?parentPage [*]) 
              :where [?parentPage :block/children ?referencingBlock] 
                     [?referencingBlock :block/refs ?referencedPage] 
                     [?referencedPage :node/title "Aliases"]
             ]`
        )
        .map((p) => p[0]);
    // This function is handpicked from David Vargas' roam-client.
    // It is used to grab configuration from a Roam page. 
    // You can find the whole library here: https://github.com/dvargas92495/roam-client
    var uidWithAliases = pagesWithAliases.map((p) => ({
        title: p.title,
        uid: p.uid,
        aliases:
            getConfigFromPage(p.title)
                ?.Aliases?.split(",")
                ?.map((a) => a.trim()) || [],
    }));

    for (i = 0; i < uidWithAliases.length; i++) {
        try {
            for (j = 0; j < uidWithAliases[i].aliases.length; j++) {
                aliasMap.set(uidWithAliases[i].aliases[j].trim(), uidWithAliases[i].title);
            };
        }
        catch (err) {
            continue;
        };
    };
    return aliasMap;
};

// This function is handpicked from David Vargas' roam-client.
// It is used to grab configuration from a Roam page. 
// You can find the whole library here: https://github.com/dvargas92495/roam-client
const toAttributeValue = (s) =>
    (s.trim().startsWith("{{or: ")
        ? s.substring("{{or: ".length, s.indexOf("|"))
        : s
    ).trim();

// This function is handpicked from David Vargas' roam-client.
// It is used to grab configuration from a Roam page. 
// You can find the whole library here: https://github.com/dvargas92495/roam-client
const getAttrConfigFromQuery = (query) => {
    const pageResults = window.roamAlphaAPI.q(query);
    if (pageResults.length === 0 || !pageResults[0][0].attrs) {
        return {};
    }

    const configurationAttrRefs = pageResults[0][0].attrs.map(
        (a) => a[2].source[1]
    );
    const entries = configurationAttrRefs.map(
        (r) =>
            window.roamAlphaAPI
                .q(
                    `[:find (pull ?e [:block/string]) :where [?e :block/uid "${r}"] ]`
                )[0][0]
                .string?.split("::")
                .map(toAttributeValue) || [r, "undefined"]
    );
    return Object.fromEntries(entries);
};

// This function is handpicked from David Vargas' roam-client.
// It is used to grab configuration from a Roam page. 
// You can find the whole library here: https://github.com/dvargas92495/roam-client
const getConfigFromPage = (inputPage) => {
    const page =
        inputPage ||
        document.getElementsByClassName("rm-title-display")[0]?.textContent;
    if (!page) {
        return {};
    }
    return getAttrConfigFromQuery(
        `[:find (pull ?e [*]) :where [?e :node/title "${page}"] ]`
    );
};

function pageTaggedInParent(node, page) {
    parent = node.parentElement;
    while (parent.classList.contains("roam-article") == false) {
        parent = parent.parentElement;
        if (parent.hasAttribute("data-page-links")) {
            linkedPages = JSON.parse(parent.getAttribute("data-page-links"));
            if (linkedPages.includes(page)) {
                return true;
            };
        };
    };
    return false;
};

// For adding the highlights on page change
history.pushState = (f => function pushState() {
    var ret = f.apply(this, arguments);
    window.dispatchEvent(new Event('pushstate'));
    window.dispatchEvent(new Event('locationchange'));
    return ret;
})(history.pushState);
history.replaceState = (f => function replaceState() {
    var ret = f.apply(this, arguments);
    window.dispatchEvent(new Event('replacestate'));
    window.dispatchEvent(new Event('locationchange'));
    return ret;
})(history.replaceState);
window.addEventListener('popstate', () => {
    window.dispatchEvent(new Event('locationchange'))
});

function findTargetNodes(blocks, pages, aliases) {
    matched = false;
    loop1:
    for (i = 0; i < blocks.length; i++) {
        // all blocks only have 1 top level child node, a span.
        // skip to the second level of children
        for (j = 0; j < blocks[i].childNodes[0].childNodes.length; j++) {
            node = blocks[i].childNodes[0].childNodes[j];
            if (node.nodeType == 3) { // only text, no more childrens
                if (spanWrapper(node, pages, aliases) == true) {
                    matched = true;
                    continue loop1;
                };
                continue;
            };
            if (node.nodeType == 1) { // element node type, need to dig deeper
                // these are already linked, skip
                if (node.hasAttribute("data-link-title")
                    || node.hasAttribute("data-tag")
                    || node.hasAttribute("recommend")) {
                    continue;
                };
                if (node.hasChildNodes()) {
                    for (k = 0; k < node.childNodes.length; k++) {
                        if (node.childNodes[k].nodeType == 3) { // only text, no more childrens
                            if (spanWrapper(node.childNodes[k], pages, aliases)) {
                                matched = true;
                                continue loop1;
                            }
                            continue;
                        };
                        if (node.nodeType == 1) { // element node type, need to dig deeper
                            // these are already linked, skip
                            if (node.childNodes[k].hasAttribute("data-link-title")
                                || node.childNodes[k].hasAttribute("data-tag")
                                || node.childNodes[k].hasAttribute("recommend")) {
                                continue;
                            };
                        };
                    };
                };
            };
        };
    };
    return matched;
};

function runUnlinkFinder() {
    matchFound = false;
    setTimeout(function () {
        do {
            let blocks = document.getElementsByClassName("roam-block");
            matchFound = findTargetNodes(blocks, unlinkFinderPages, unlinkFinderAliases);
        } while (matchFound == true);
    }, 1000);
    addContextMenuListener();
};

function unlinkFinder() {
    // blocks on the page where the button is clicked
    // get all pages in the graph
    unlinkFinderPages = getAllPages();
    unlinkFinderAliases = getAllAliases();
    unlinkFinderConfig = getConfigFromPage("Unlink Finder");
    if (unlinkFinderConfig["Minimum Characters"]) {
        minimumPageLength = parseInt(unlinkFinderConfig["Minimum Characters"]);
    } else {
        minimumPageLength = 2
    }
    if (unlinkFinderConfig["Alias Case-Sensitive"] == "Y") {
        aliasCaseSensitive = true
    } else {
        aliasCaseSensitive = false
    }
    matchFound = false;

    if (document.getElementById("unlink-finder-icon").getAttribute("status") == "off") {
        document.getElementById("unlink-finder-icon").setAttribute("status", "on");
        addUnlinkFinderLegend();
        reAddUnlinkTargets();
        do {
            let blocks = document.getElementsByClassName("roam-block");
            matchFound = findTargetNodes(blocks, unlinkFinderPages, unlinkFinderAliases);
        } while (matchFound == true);
        document.addEventListener("blur", runUnlinkFinder, true);
        window.addEventListener("locationchange", runUnlinkFinder, true);
        addContextMenuListener()
    } else {
        document.getElementById("unlink-finder-icon").setAttribute("status", "off");
        removeUnlinkFinderLegend();
        removeUnlinkTargets();
        document.removeEventListener("blur", runUnlinkFinder, true);
        window.removeEventListener("locationchange", runUnlinkFinder, true);
    };
};

function spanWrapper(node, pages, aliases) {
    try {
        for (const [key, value] of aliases.entries()) {
            aliasKey = key.toLowerCase();
            if (aliasCaseSensitive) {
                aliasKey = key;
            };
            if ((aliasCaseSensitive && node.textContent.includes(key)) ||
                (!aliasCaseSensitive && node.textContent.toLowerCase().includes(key.toLowerCase()))) {
                // iterate over the childNodes and do stuff on childNodes that 
                // don't have the data-link-title attribute
                start = node.textContent.toLowerCase().indexOf(key.toLowerCase());
                end = start + key.length;
                beforeLinkText = node.textContent.slice(0, start);
                firstCharBeforeMatch = node.textContent.slice(start - 1)[0];
                firstCharAfterMatch = node.textContent.slice(start).substr(key.length)[0];
                linkText = node.textContent.slice(start, end);
                afterLinkText = node.textContent.slice(end);
                // create span with page name
                var matchSpan = document.createElement("span");
                matchSpan.classList.add("unlink-finder");
                matchSpan.setAttribute("data-text", value);
                matchSpan.style.cssText += `position: relative; background: ${aliasWordMatchStyle}`;
                matchSpan.classList.add("alias-word-match");
                matchSpan.setAttribute("recommend", "underline");
                matchSpan.innerText = linkText;
                // truncate existing text node
                node.textContent = beforeLinkText;
                // add that span after the text node
                node.parentNode.insertBefore(matchSpan, node.nextSibling);
                // create a text node with the remainder text
                remainderText = document.createTextNode(afterLinkText);
                // add that remainder text after inserted node
                node.parentNode.insertBefore(remainderText, node.nextSibling.nextSibling);
                return true;
            };
        };
        for (l = 0; l < pages.length; l++) {
            if (pages[l].length < minimumPageLength) {
                continue;
            }
            if (node.textContent.toLowerCase().includes(pages[l].toLowerCase())) {
                // iterate over the childNodes and do stuff on childNodes that 
                // don't have the data-link-title attribute
                start = node.textContent.toLowerCase().indexOf(pages[l].toLowerCase());
                end = start + pages[l].length;
                beforeLinkText = node.textContent.slice(0, start);
                firstCharBeforeMatch = node.textContent.slice(start - 1)[0];
                firstCharAfterMatch = node.textContent.slice(start).substr(pages[l].length)[0];
                linkText = node.textContent.slice(start, end);
                afterLinkText = node.textContent.slice(end);
                // create span with page name
                matchSpan = document.createElement("span");
                matchSpan.classList.add("unlink-finder");
                matchSpan.style.cssText += `background: ${exactWordMatchStyle}`;
                matchSpan.classList.add("exact-word-match");
                matchSpan.setAttribute("recommend", "underline");
                matchSpan.setAttribute("data-text", pages[l]);
                if (linkText != pages[l]) {
                    matchSpan.classList.add("fuzzy-word-match");
                    matchSpan.classList.remove("exact-word-match");
                    matchSpan.style.cssText += `position:relative; background: ${fuzzyWordMatchStyle}`;
                };
                if ((![".", " ", ",", "-", "!", "?", "_", "/", ":", ";", "'", '"', "@", ")", "(", "{", "}", "[", "]", "^", "*", "#"].includes(firstCharAfterMatch) && end != node.textContent.length) ||
                    (![".", " ", ",", "-", "!", "?", "_", "/", ":", ";", "'", '"', "@", ")", "(", "{", "}", "[", "]", "^", "*", "#"].includes(firstCharBeforeMatch) && start != 0)) {
                    matchSpan.classList.add("partial-word-match");
                    matchSpan.classList.remove("exact-word-match");
                    matchSpan.style.cssText += `background: ${partialWordMatchStyle}`;
                };
                if (pageTaggedInParent(node, pages[l]) == true) {
                    matchSpan.classList.add("redundant-word-match");
                    matchSpan.classList.remove("exact-word-match");
                    matchSpan.style.cssText += `background: ${redundantWordMatchStyle}`;
                };
                matchSpan.innerText = linkText;
                // truncate existing text node
                node.textContent = beforeLinkText;
                // add that span after the text node
                node.parentNode.insertBefore(matchSpan, node.nextSibling);
                // create a text node with the remainder text
                remainderText = document.createTextNode(afterLinkText);
                // add that remainder text after inserted node
                node.parentNode.insertBefore(remainderText, node.nextSibling.nextSibling);
                return true;
            };
        };
    }
    catch (err) {
        return false;
    };
};

function removeUnlinkTargets() {
    targetNodes = document.getElementsByClassName("unlink-finder");
    for (i = 0; i < targetNodes.length; i++) {
        if (targetNodes[i].classList.contains("unlink-finder-legend")) {
            continue;
        };
        if (targetNodes[i].classList.contains("exact-word-match")) {
            targetNodes[i].classList.remove("exact-word-match");
            targetNodes[i].classList.add("exact-word-match-inactive");
            targetNodes[i].style.cssText = "";
        };
        if (targetNodes[i].classList.contains("fuzzy-word-match")) {
            targetNodes[i].classList.remove("fuzzy-word-match");
            targetNodes[i].classList.add("fuzzy-word-match-inactive");
            targetNodes[i].style.cssText = "";
        };
        if (targetNodes[i].classList.contains("partial-word-match")) {
            targetNodes[i].classList.remove("partial-word-match");
            targetNodes[i].classList.add("partial-word-match-inactive");
            targetNodes[i].style.cssText = "";
        };
        if (targetNodes[i].classList.contains("redundant-word-match")) {
            targetNodes[i].classList.remove("redundant-word-match");
            targetNodes[i].classList.add("redundant-word-match-inactive");
            targetNodes[i].style.cssText = "";
        };
        if (targetNodes[i].classList.contains("alias-word-match")) {
            targetNodes[i].classList.remove("alias-word-match");
            targetNodes[i].classList.add("alias-word-match-inactive");
            targetNodes[i].style.cssText = "";
        };
    };
};

function reAddUnlinkTargets() {
    targetNodes = document.getElementsByClassName("unlink-finder");
    for (i = 0; i < targetNodes.length; i++) {
        if (targetNodes[i].classList.contains("unlink-finder-legend")) {
            continue;
        };
        if (targetNodes[i].classList.contains("exact-word-match-inactive")) {
            targetNodes[i].classList.remove("exact-word-match-inactive");
            targetNodes[i].classList.add("exact-word-match");
            targetNodes[i].style.cssText = `background: ${exactWordMatchStyle}`;
        };
        if (targetNodes[i].classList.contains("fuzzy-word-match-inactive")) {
            targetNodes[i].classList.remove("fuzzy-word-match-inactive");
            targetNodes[i].classList.add("fuzzy-word-match");
            targetNodes[i].style.cssText = `position:relative; background: ${fuzzyWordMatchStyle}`;
        };
        if (targetNodes[i].classList.contains("partial-word-match-inactive")) {
            targetNodes[i].classList.remove("partial-word-match-inactive");
            targetNodes[i].classList.add("partial-word-match");
            targetNodes[i].style.cssText = `background: ${partialWordMatchStyle}`;
        };
        if (targetNodes[i].classList.contains("redundant-word-match-inactive")) {
            targetNodes[i].classList.remove("redundant-word-match-inactive");
            targetNodes[i].classList.add("redundant-word-match");
            targetNodes[i].style.cssText = `background: ${redundantWordMatchStyle}`;
        };
        if (targetNodes[i].classList.contains("alias-word-match-inactive")) {
            targetNodes[i].classList.remove("alias-word-match-inactive");
            targetNodes[i].classList.add("alias-word-match");
            targetNodes[i].style.cssText = `position: relative; background: ${aliasWordMatchStyle}`;
        };
    };
};

unlinkFinderElementToLink = null;
unlinkFinderBackdrop = null;
unlinkFinderMenu = null;
unlinkFinderMenuOptions = null;
unlinkFinderMenuVisible = false;

// for some reason this is running multiple times on each click
// first link = 1 time
// second link = 2 times
// etc
// this causes the menu to not be displayed for some reason.
// it is because I am adding multiple event listeners to each element!!
const toggleMenu = command => {
    // console.log("TOGGLING MENU: " + command)
    unlinkFinderMenu.style.display = command === "show" ? "block" : "none";
    unlinkFinderBackdrop.style.display = command === "show" ? "block" : "none";
    if (command == "show") {
        unlinkFinderMenuVisible = true
    } else {
        unlinkFinderMenuVisible = false
    }
};

const setPosition = ({ top, left }) => {
    unlinkFinderMenu.style.left = `${left}px`;
    unlinkFinderMenu.style.top = `${top}px`;
    toggleMenu("show");
};

function addContextMenuListener() {
    var unlinkFinderMatches = document.querySelectorAll(".unlink-finder");
    for (var i = 0, len = unlinkFinderMatches.length; i < len; i++) {
        var match = unlinkFinderMatches[i];
        match.addEventListener("contextmenu", function (e) {
            e.preventDefault();
            const origin = {
                left: e.pageX,
                top: e.pageY
            };
            setPosition(origin);
            unlinkFinderElementToLink = e.target;
            return false;
        });
    }
}

function setupUnlinkFinderContextMenu() {

    window.addEventListener("click", e => {
        if (unlinkFinderMenuVisible) { toggleMenu("hide") };
    });

    for (var i = 0; i < unlinkFinderMenuOptions.length; i++) {
        unlinkFinderMenuOptions[i].addEventListener("click", e => {
            if (e.target.innerHTML == "Link using [[Reference]]") {
                linkUsingReference(unlinkFinderElementToLink);
            }
            if (e.target.innerHTML == "Link using [Alias]([[Reference]])") {
                linkUsingAlias(unlinkFinderElementToLink);
            }
        });
    }
}

function countOfPreviousMatches(el) {
    let matchedWord = el.innerText;
    let count = 1;
    while (el.previousSibling != null) {
        if (el.previousSibling.textContent.includes(matchedWord)) {
            count += 1;
        };
        el = el.previousSibling;
    };
    return count;
}


function replaceMatchedWord(count, text, matchedWord, futureWord) {
    var t = 0;
    var re = new RegExp(matchedWord, "g");
    return text.replace(re, function (match) {
        t++;
        return (t === count) ? futureWord : match;
    });
}


// TODO: get the right matched item if there are many matches of the same element in the block
function linkUsingReference(el) {
    let actualPageName = el.getAttribute("data-text");
    let matchedWord = el.innerText;
    let futureWord = "[[" + actualPageName + "]]"
    locationOfMatchedWord = countOfPreviousMatches(el);
    blockUid = el.parentNode.parentNode.id.slice(-9);
    let currentText = window.roamAlphaAPI.q(`[:find (pull ?e [:block/string]) :where [?e :block/uid "${blockUid}"]]`)[0][0].string
    let futureText = replaceMatchedWord(locationOfMatchedWord, currentText, matchedWord, futureWord)
    removeUnlinkSpans(el.parentNode);
    window.roamAlphaAPI.updateBlock({ "block": { "uid": blockUid, "string": futureText } });
}

function linkUsingAlias(el) {
    let actualPageName = el.getAttribute("data-text");
    let matchedWord = el.innerText;
    let futureWord = "[" + matchedWord + "]([[" + actualPageName + "]])"
    locationOfMatchedWord = countOfPreviousMatches(el);
    blockUid = el.parentNode.parentNode.id.slice(-9);
    let currentText = window.roamAlphaAPI.q(`[:find (pull ?e [:block/string]) :where [?e :block/uid "${blockUid}"]]`)[0][0].string
    let futureText = replaceMatchedWord(locationOfMatchedWord, currentText, matchedWord, futureWord)
    removeUnlinkSpans(el.parentNode);
    window.roamAlphaAPI.updateBlock({ "block": { "uid": blockUid, "string": futureText } });
}

function createCustomContextMenu() {
    var portalDiv = document.createElement("div");
    portalDiv.classList.add("bp3-portal");
    var overlayDiv = document.createElement("div");
    overlayDiv.classList.add("bp3-overlay");
    overlayDiv.classList.add("bp3-overlay-open")
    var backdropDiv = document.createElement("div");
    backdropDiv.classList.add("bp3-overlay-backdrop");
    backdropDiv.classList.add("bp3-popover-backdrop");
    backdropDiv.classList.add("bp3-popover-appear-done");
    backdropDiv.classList.add("bp3-popover-enter-done");
    backdropDiv.classList.add("unlink-finder-context-backdrop");
    backdropDiv.style.cssText = `display: none;`;
    var containerDiv = document.createElement("div");
    containerDiv.classList.add("bp3-transition-container");
    containerDiv.classList.add("bp3-popover-appear-done");
    containerDiv.classList.add("bp3-popover-enter-done");
    containerDiv.classList.add("unlink-finder-context-menu");
    containerDiv.style.cssText = `display: none; width: auto; position: fixed;`;
    var popoverDiv = document.createElement("div");
    popoverDiv.classList.add("bp3-popover");
    popoverDiv.classList.add("bp3-minimal");
    var popoverContentDiv = document.createElement("div");
    popoverContentDiv.classList.add("bp3-popover-content");
    var blankDiv = document.createElement("div");
    var menuDiv = document.createElement("ul");
    menuDiv.classList.add("bp3-text-small");
    menuDiv.classList.add("bp3-menu");
    var referenceLink = document.createElement("li");
    referenceLink.classList.add("unlink-finder-context-menu-option");
    var referenceLinkAction = document.createElement("a");
    referenceLinkAction.classList.add("bp3-menu-item");
    referenceLinkAction.classList.add("bp3-popover-dismiss");
    var referenceLinkText = document.createElement("div");
    referenceLinkText.classList.add("bp3-text-overflow-ellipsis");
    referenceLinkText.classList.add("bp3-fill");
    referenceLinkText.innerText = "Link using [[Reference]]";

    var aliasLink = document.createElement("li");
    aliasLink.classList.add("unlink-finder-context-menu-option")
    var aliasLinkAction = document.createElement("a");
    aliasLinkAction.classList.add("bp3-menu-item")
    aliasLinkAction.classList.add("bp3-popover-dismiss")
    var aliasLinkText = document.createElement("div");
    aliasLinkText.classList.add("bp3-text-overflow-ellipsis")
    aliasLinkText.classList.add("bp3-fill")
    aliasLinkText.innerText = "Link using [Alias]([[Reference]])"

    aliasLinkAction.appendChild(aliasLinkText);
    aliasLink.appendChild(aliasLinkAction);
    referenceLinkAction.appendChild(referenceLinkText);
    referenceLink.appendChild(referenceLinkAction);
    menuDiv.appendChild(referenceLink);
    menuDiv.appendChild(aliasLink);
    blankDiv.appendChild(menuDiv);
    popoverContentDiv.appendChild(blankDiv);
    popoverDiv.appendChild(popoverContentDiv);
    containerDiv.appendChild(popoverDiv);
    overlayDiv.appendChild(backdropDiv);
    overlayDiv.appendChild(containerDiv);
    portalDiv.appendChild(overlayDiv);

    document.getElementById("app").appendChild(portalDiv);
}

function removeUnlinkFinderLegend() {
    document.getElementById("unlink-finder-legend").remove();
};

function createUnlinkFinderLegendElement(matchType, matchStyle, matchText) {
    var matchSpan = document.createElement('span');
    matchSpan.classList.add('unlink-finder-legend');
    matchSpan.classList.add('unlink-finder');
    matchSpan.classList.add(matchType);
    matchSpan.innerText = matchText;
    matchSpan.setAttribute("data-text", "Actual Page Name")
    matchSpan.style.cssText = `margin-right: 4px; position:relative; background: ${matchStyle}`;
    return matchSpan;
}

function addUnlinkFinderLegend() {
    if (document.getElementById("unlink-finder-legend") == null) {
        var unlinkFinderLegend = document.createElement('div');
        unlinkFinderLegend.classList.add('unlink-finder-legend');
        unlinkFinderLegend.id = 'unlink-finder-legend';
        unlinkFinderLegend.setAttribute("style", "margin-left: 4px;");
        unlinkFinderLegend.style.cssText = "border-style: groove;"
        var legendKey = document.createElement('span');
        legendKey.classList.add('unlink-finder-legend');
        legendKey.classList.add('unlink-finder');
        legendKey.innerText = "Match Types: ";
        legendKey.style.cssText = "margin-left: 4px; margin-right: 4px;";
        var aliasWordMatch = createUnlinkFinderLegendElement("alias-word-match", aliasWordMatchStyle, "Alias");
        var exactWordMatch = createUnlinkFinderLegendElement("exact-word-match", exactWordMatchStyle, "Exact");
        var fuzzyWordMatch = createUnlinkFinderLegendElement("fuzzy-word-match", fuzzyWordMatchStyle, "Fuzzy");
        var partialWordMatch = createUnlinkFinderLegendElement("partial-word-match", partialWordMatchStyle, "Partial");
        var redundantWordMatch = createUnlinkFinderLegendElement("redundant-word-match", redundantWordMatchStyle, "Redundant");
        unlinkFinderLegend.appendChild(legendKey);
        unlinkFinderLegend.appendChild(aliasWordMatch);
        unlinkFinderLegend.appendChild(exactWordMatch);
        unlinkFinderLegend.appendChild(fuzzyWordMatch);
        unlinkFinderLegend.appendChild(partialWordMatch);
        unlinkFinderLegend.appendChild(redundantWordMatch);
        var roamTopbar = document.getElementsByClassName("rm-topbar");
        roamTopbar[0].insertBefore(unlinkFinderLegend, roamTopbar[0].childNodes[2]);
    }
}

function unlinkFinderButton() {
    var unlinkFinderButton = document.createElement('span');
    unlinkFinderButton.classList.add('bp3-popover-wrapper');
    unlinkFinderButton.setAttribute("style", "margin-left: 4px;")
    var spanTwo = document.createElement('span');
    spanTwo.classList.add('bp3-popover-target');
    unlinkFinderButton.appendChild(spanTwo);
    var unlinkFinderIcon = document.createElement('span');
    unlinkFinderIcon.id = 'unlink-finder-icon';
    unlinkFinderIcon.setAttribute("status", "off")
    unlinkFinderIcon.classList.add('bp3-icon-search-around', 'bp3-button', 'bp3-minimal', 'bp3-small');
    spanTwo.appendChild(unlinkFinderIcon);
    var roamTopbar = document.getElementsByClassName("rm-topbar");
    roamTopbar[0].appendChild(unlinkFinderButton);
    unlinkFinderIcon.onclick = unlinkFinder;
};

getCSSProp = (element, propName) => getComputedStyle(element).getPropertyValue(propName);

if (document.getElementById("unlink-finder-icon") == null) {
    aliasWordMatchStyle = "rgba(125, 188, 255, 0.6)";
    exactWordMatchStyle = "rgba(71,151, 101, 0.4)";
    fuzzyWordMatchStyle = "rgba(220, 171, 121, 0.6)";
    partialWordMatchStyle = "rgba(229, 233, 236, 1.0)";
    redundantWordMatchStyle = "rgba(168, 42, 42, 0.4)";
    unlinkFinderButton();
    createCustomContextMenu();
    unlinkFinderBackdrop = document.querySelector(".unlink-finder-context-backdrop");
    unlinkFinderMenu = document.querySelector(".unlink-finder-context-menu");
    unlinkFinderMenuOptions = document.querySelectorAll(".unlink-finder-context-menu-option");
    setupUnlinkFinderContextMenu();
};
