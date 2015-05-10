// jshint newcap: false
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory); // AMD. Register as an anonymous module.
  } else if (typeof exports === 'object') {
    module.exports = factory(); // NodeJS
  } else { // Browser globals (root is window)
  root.snabbdom = factory();
  }
}(this, function () {

'use strict';

var isArr = Array.isArray;

function isString(s) { return typeof s === 'string'; }
function isPrimitive(s) { return typeof s === 'string' || typeof s === 'number'; }
function isUndef(s) { return s === undefined; }

function VNode(tag, props, children, text, elm) {
  var key = !isUndef(props) ? props.key : undefined;
  return {tag: tag, props: props, children: children,
          text: text, elm: elm, key: key};
}

function emptyNodeAt(elm) {
  return VNode(elm.tagName, {style: {}, class: {}}, [], undefined, elm);
}
var frag = document.createDocumentFragment();
var emptyNode = VNode(undefined, {style: {}, class: {}}, [], undefined);

function h(selector, b, c) {
  var props = {}, children, tag, text, i;
  if (arguments.length === 3) {
    props = b;
    if (isArr(c)) { children = c; }
    else if (isPrimitive(c)) { text = c; }
  } else if (arguments.length === 2) {
    if (isArr(b)) { children = b; }
    else if (isPrimitive(b)) { text = b; }
    else { props = b; }
  }
  // Parse selector
  var hashIdx = selector.indexOf('#');
  var dotIdx = selector.indexOf('.', hashIdx);
  var hash = hashIdx > 0 ? hashIdx : selector.length;
  var dot = dotIdx > 0 ? dotIdx : selector.length;
  tag = selector.slice(0, Math.min(hash, dot));
  if (hash < dot) props.id = selector.slice(hash + 1, dot);
  if (dotIdx > 0) props.className = selector.slice(dot+1).replace(/\./g, ' ');

  if (isArr(children)) {
    for (i = 0; i < children.length; ++i) {
      if (isPrimitive(children[i])) children[i] = VNode(undefined, undefined, undefined, children[i]);
    }
  }
  return VNode(tag, props, children, text, undefined);
}

function updateProps(elm, oldProps, props) {
  var key, val, name, on;
  for (key in props) {
    val = props[key];
    if (key === 'style') {
      for (name in val) {
        on = val[name];
        if (on !== oldProps.style[name]) {
          elm.style[name] = val[name];
        }
      }
    } else if (key === 'class') {
      for (name in val) {
        on = val[name];
        if (on !== oldProps.class[name]) {
          elm.classList[on ? 'add' : 'remove'](name);
        }
      }
    } else if (key !== 'key') {
      elm[key] = val;
    }
  }
}

function createElm(vnode) {
  var elm;
  if (!isUndef(vnode.tag)) {
    elm = document.createElement(vnode.tag);
    updateProps(elm, emptyNode.props, vnode.props);
    var children = vnode.children;
    if (isArr(children)) {
      for (var i = 0; i < vnode.children.length; ++i) {
        elm.appendChild(createElm(children[i]));
      }
    } else if (isPrimitive(vnode.text)) {
      elm.textContent = vnode.text;
    }
  } else {
    elm = document.createTextNode(vnode.text);
  }
  vnode.elm = elm;
  return elm;
}

function sameVnode(vnode1, vnode2) {
  return vnode1.key === vnode2.key && vnode1.tag === vnode2.tag;
}

function createKeyToOldIdx(children, beginIdx, endIdx) {
  var i, map = {};
  for (i = beginIdx; i <= endIdx; ++i) {
    var ch = children[i];
    if (!isUndef(ch.props) && !isUndef(ch.props.key)) {
      map[ch.props.key] = i;
    }
  }
  return map;
}

function updateChildren(parentElm, oldCh, newCh) {
  var oldStartIdx = 0, oldEndIdx, oldStartVnode, oldEndVnode;
  if (isUndef(oldCh)) {
    oldEndIdx = -1;
  } else {
    oldEndIdx = oldCh.length - 1;
    oldStartVnode = oldCh[0];
    oldEndVnode = oldCh[oldEndIdx];
  }

  var newStartIdx = 0, newEndIdx, newStartVnode, newEndVnode;
  if (isUndef(newCh)) {
    newEndIdx = -1;
  } else {
    newEndIdx = newCh.length - 1;
    newStartVnode = newCh[0];
    newEndVnode = newCh[newEndIdx];
  }

  var oldKeyToIdx;

  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (isUndef(oldStartVnode)) {
      oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
    } else if (isUndef(oldEndVnode)) {
      oldEndVnode = oldCh[--oldEndIdx];
    } else if (sameVnode(oldStartVnode, newStartVnode)) {
      while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx &&
             !isUndef(oldStartVnode) && sameVnode(oldStartVnode, newStartVnode)) {
        patchElm(oldStartVnode, newStartVnode);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      }
    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      patchElm(oldEndVnode, newEndVnode);
      oldEndVnode = oldCh[--oldEndIdx];
      newEndVnode = newCh[--newEndIdx];
    } else if (!isUndef(oldStartVnode) && !isUndef(newEndVnode) &&
               sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
      patchElm(oldStartVnode, newEndVnode);
      parentElm.insertBefore(oldStartVnode.elm, oldEndVnode.elm.nextSibling);
      oldStartVnode = oldCh[++oldStartIdx];
      newEndVnode = newCh[--newEndIdx];
    } else if (!isUndef(oldEndVnode) && !isUndef(newStartVnode) &&
        sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
      patchElm(oldEndVnode, newStartVnode);
      parentElm.insertBefore(oldEndVnode.elm, oldStartVnode.elm);
      oldEndVnode = oldCh[--oldEndIdx];
      newStartVnode = newCh[++newStartIdx];
    } else {
      if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
      var idxInOld = oldKeyToIdx[newStartVnode.key];
      if (isUndef(idxInOld)) { // New element
        createElm(newStartVnode);
        parentElm.insertBefore(newStartVnode.elm, oldStartVnode.elm);
        newStartVnode = newCh[++newStartIdx];
      } else {
        var elmToMove = oldCh[idxInOld];
        patchElm(elmToMove, newStartVnode);
        oldCh[idxInOld] = undefined;
        parentElm.insertBefore(elmToMove.elm, oldStartVnode.elm);
        newStartVnode = newCh[++newStartIdx];
      }
    }
  }
  if (oldStartIdx > oldEndIdx) { // Done with old elements
    for (; newStartIdx <= newEndIdx; ++newStartIdx) {
      frag.appendChild(createElm(newCh[newStartIdx]));
    }
    if (isUndef(oldStartVnode)) {
      parentElm.appendChild(frag);
    } else {
      parentElm.insertBefore(frag, oldStartVnode.elm);
    }
  } else if (newStartIdx > newEndIdx) { // Done with new elements
    for (; oldStartIdx <= oldEndIdx; ++oldStartIdx) {
      var ch = oldCh[oldStartIdx];
      if (!isUndef(ch)) {
        parentElm.removeChild(oldCh[oldStartIdx].elm);
        oldCh[oldStartIdx].elm = undefined;
      }
    }
  }
}

function patchElm(oldVnode, newVnode) {
  var elm = newVnode.elm = oldVnode.elm;
  updateProps(elm, oldVnode.props, newVnode.props);
  if (isUndef(newVnode.text)) {
    updateChildren(elm, oldVnode.children, newVnode.children);
  } else {
    if (oldVnode.text !== newVnode.text) {
      elm.textContent = newVnode.text;
    }
  }
  return newVnode;
}

return {h: h, createElm: createElm, patchElm: patchElm, patch: patchElm, emptyNodeAt: emptyNodeAt, emptyNode: emptyNode};

}));
