// SPDX-License-Identifier: MPL-2.0
import { mount } from "svelte";
import "@fontsource/noto-sans-hebrew/400.css";
import "./app.css";
import App from "./App.svelte";

mount(App, { target: document.getElementById("app")! });
