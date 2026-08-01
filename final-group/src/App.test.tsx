// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { screen } from "@testing-library/react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App, categoryLabel, statusLabel } from "./App";
import type { TripBackend, TripSnapshot } from "./firebase/contracts";
let root: Root | undefined; let container: HTMLDivElement | undefined;
afterEach(async()=>{await act(async()=>root?.unmount());container?.remove();root=undefined;container=undefined;});
describe("TripFlow App composition",()=>{
 it("maps persisted vocabulary without coercion",()=>{expect(categoryLabel("stay")).toBe("Stay");expect(statusLabel("happening")).toBe("In progress");});
 it("shows English auth when no session exists",async()=>{await render(<App backend={backend(null)}/>);expect(screen.getByTestId("auth-workbench")).toBeTruthy();expect(container?.textContent).toContain("Log in");});
 it("keeps English join-by-code visibly fail-closed",async()=>{await render(<App backend={backend(user,null,[])}/>);expect(screen.getByRole("region",{name:"Join by code"})).toBeTruthy();expect((screen.getByRole("button",{name:"Join by code is not available yet"}) as HTMLButtonElement).disabled).toBe(true);});
 it("labels the synthetic preview and provides a route back to the real app",async()=>{const onExitDemo=vi.fn();await render(<App backend={backend(user,snapshot.trip,[snapshot.trip],snapshot)} demoMode onExitDemo={onExitDemo}/>);expect(screen.getByTestId("local-demo-notice").textContent).toContain("Local demo data");await screen.getByRole("button",{name:"Exit demo"}).click();expect(onExitDemo).toHaveBeenCalledOnce();});
 it("opens the real English timeline and expenses views",async()=>{await render(<App backend={backend(user,snapshot.trip,[snapshot.trip],snapshot)}/>);await open("schedule");expect(screen.getByTestId("events-workbench")).toBeTruthy();expect(container?.textContent).toContain("Timeline");await open("expenses");expect(container?.textContent).toContain("Expenses");expect(screen.getByRole("button",{name:"Add expense"})).toBeTruthy();});
});
async function render(node:ReactNode){container=document.createElement("div");document.body.append(container);root=createRoot(container);await act(async()=>{root?.render(node);await Promise.resolve();await Promise.resolve();});}
async function open(view:"schedule"|"expenses"){const link=container?.querySelector<HTMLAnchorElement>(`a[href="#${view}"]`);expect(link).toBeTruthy();await act(async()=>{link?.click();await new Promise((r)=>setTimeout(r,220));});}
const user={uid:"user-1",email:"user@example.com",displayName:"Lan"};
const snapshot:TripSnapshot={trip:{id:"trip-1",name:"Da Lat",destination:"Da Lat",startDate:"2026-08-01",endDate:"2026-08-03",leadId:"user-1",joinCode:"DALAT26"},members:[{uid:"user-1",displayName:"Lan",email:"user@example.com",role:"lead",responsibility:"Timeline",isDemo:false}],events:[{id:"event-1",order:0,title:"Check in",description:"Meet in the lobby.",category:"stay",startAt:"2026-08-01T08:00:00.000Z",endAt:"2026-08-01T09:00:00.000Z",status:"happening",participantIds:["user-1"],createdBy:"user-1",approvedBy:"user-1"}],expenses:[{id:"expense-1",title:"Hotel",amount:1000000,paidBy:"user-1",splitAmong:["user-1"],status:"pending",createdBy:"user-1"}]};
function backend(session:typeof user|null,profileTrip:TripSnapshot["trip"]|null=null,trips=profileTrip?[profileTrip]:[],selected:TripSnapshot|null=null):TripBackend{return{observeSession:(l)=>{l(session);return vi.fn();},register:vi.fn(),login:vi.fn(),logout:vi.fn(),upsertProfile:vi.fn(),getProfile:vi.fn().mockResolvedValue(session?{uid:session.uid,email:session.email,displayName:session.displayName,tripIds:profileTrip?[profileTrip.id]:[]}:null),subscribeTrips:(_u,l)=>{l(trips);return vi.fn();},subscribeTrip:(_t,l)=>{if(selected)l(selected);return vi.fn();},createTrip:vi.fn(),joinTrip:vi.fn(),updateResponsibility:vi.fn(),removeMember:vi.fn(),createEvent:vi.fn(),updateEvent:vi.fn(),approveEvent:vi.fn(),deleteEvent:vi.fn(),reorderEvents:vi.fn(),createExpense:vi.fn(),updateExpense:vi.fn(),deleteExpense:vi.fn(),settleExpense:vi.fn()};}
