import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { BrowserRouter } from "react-router-dom";
import { RecoilRoot } from "recoil";
import { SocketContextProvider } from "./context/SocketContext.jsx";

// MUI
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// AntD
import { ConfigProvider } from "antd";

// Notistack (Snackbar)
import { SnackbarProvider } from "notistack";

// Custom MUI theme
const muiTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#9b59b6",
    },
    background: {
      default: "#1e272e",
      paper: "#263238",
    },
    text: {
      primary: "#ffffff",
    },
  },
  typography: {
    fontFamily: "Roboto, sans-serif",
  },
});

// Ant Design theme config
const antThemeConfig = {
  token: {
    colorPrimary: "#9b59b6",
    colorBgBase: "#1e272e",
    colorTextBase: "#ffffff",
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RecoilRoot>
      <BrowserRouter>
        <ConfigProvider theme={antThemeConfig}>
          <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
              <SocketContextProvider>
                <App />
              </SocketContextProvider>
            </SnackbarProvider>
          </ThemeProvider>
        </ConfigProvider>
      </BrowserRouter>
    </RecoilRoot>
  </React.StrictMode>
);
