import React,{createContext,useContext} from 'react';
import {FREE_ACCESS} from './premiumCatalog.js';
export const PremiumContext=createContext({access:FREE_ACCESS,assets:{},client:null,openPremium:()=>{},refresh:()=>{}});
export const usePremium=()=>useContext(PremiumContext);
