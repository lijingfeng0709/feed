"use strict";
const IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(navigator.userAgent)
  || (window.matchMedia && window.matchMedia("(max-width:768px)").matches);

