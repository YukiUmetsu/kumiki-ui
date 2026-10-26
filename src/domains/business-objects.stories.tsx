import type { Meta, StoryObj } from "@storybook/react-vite";
import { BUSINESS_OBJECTS } from "../../registry/domains/business-object-model";
import type { BusinessObjectKind } from "../../registry/domains/business-object-model";
import { BusinessObject2D } from "../../registry/domains/business-object-2d";
import { DomainGallery, ThemedStage } from "./domain-gallery";

const STRESS_TOKENS={accent:"#8A5CC2",accent2:"#D9734E",deep:"#4E6A5C"};
function Gallery(){
  return <DomainGallery heading="Business objects" entries={BUSINESS_OBJECTS}
    description="Organization, planning, process and logistics concepts"
    renderItem={(kind,theme)=><BusinessObject2D spec={{id:"gallery-"+kind,kind:kind as BusinessObjectKind}}
      theme={theme} width={168} height={140}/>}
    stress={theme=><>
      <BusinessObject2D theme={theme} width={240} height={200}
        spec={{id:"stress-long",kind:"workflow",title:"Quarterly procurement approval workflow"}}/>
      <BusinessObject2D theme={theme} width={240} height={200}
        spec={{id:"stress-cjk",kind:"delivery-truck",title:"翌日配送の物流ネットワーク"}}/>
      <BusinessObject2D theme={theme} width={240} height={200} tokens={STRESS_TOKENS}
        spec={{id:"stress-tokens",kind:"team",title:"Custom tokens"}}/>
      <BusinessObject2D theme={theme} width={240} height={200} spec={{id:"stress-active",kind:"target",state:"active"}}/>
      <BusinessObject2D theme={theme} width={240} height={200} spec={{id:"stress-done",kind:"checklist",state:"complete"}}/>
      <BusinessObject2D theme={theme} width={96} height={80} showTitle={false} spec={{id:"stress-small",kind:"idea"}}/>
    </>}/>;
}
interface PlaygroundArgs { kind:BusinessObjectKind; theme:"midnight"|"paper"; frame:number; reducedMotion:boolean }
function Playground({kind,theme,frame,reducedMotion}:PlaygroundArgs){
  return <ThemedStage theme={theme}>
    <BusinessObject2D spec={{id:"playground",kind}} theme={theme} frame={frame}
      revealFrames={20} reducedMotion={reducedMotion} width={480} height={400}/>
  </ThemedStage>;
}
const meta={title:"Finance, business and technology/Business Objects", id: "domains-business-objects",component:Playground,parameters:{layout:"centered"},
  argTypes:{kind:{control:"select",options:BUSINESS_OBJECTS.map(o=>o.kind)},
    theme:{control:"inline-radio",options:["midnight","paper"]},
    frame:{control:{type:"range",min:0,max:30,step:1}}},
  args:{kind:"org-chart",theme:"midnight",frame:30,reducedMotion:false},
} satisfies Meta<typeof Playground>;
export default meta;
type Story=StoryObj<typeof meta>;
export const AllObjects:Story={render:()=> <Gallery/>,parameters:{layout:"fullscreen"}};
export const Single:Story={};
