import { Models } from "node-appwrite";

export interface EventModel extends Models.Document {
  name: string;
  locationName: string;
  locationCity: string;
  locationAddress: string;
  description?: string;
  imageId?: string;
  userCreatorId: string;
  eventTime?: number;
  atomicCollName?: string;
  bouncers: string[];
}

export interface Event {
  $id: string;
  name: string;
  locationName: string;
  locationCity: string;
  locationAddress: string;
  description: string;
  imageUrl: string;
  eventTime: Date;
  ticketCategories?: TicketCategoryView[];
}

export interface TicketCategoryView {
  name: string;
  price: number;
  styling: Styling;
  initialQuantity: number;
  remainingQuantity?: number;
  atomicTemplateId?: number;
  $id: string;
}

export interface TicketCategoryModel extends Models.Document {
  name: string;
  price: number;
  stylingId: string;
  eventId: string;
  initialQuantity: number;
  remainingQuantity?: number;
  atomicTemplateId?: number;
}

export interface Styling {
  useBorder: boolean,
  primaryColor: string,
  secondaryColor: string,
  backgroundColor: string,
  backgroundImage: string
}

export interface StylingModel extends Models.Document, Styling { }

// The appwrite sdk is missing these classes, they should be removed when the issue is resolved
type QueryTypesSingle = string | number | boolean;
type QueryTypesList = string[] | number[] | boolean[];
type QueryTypes = QueryTypesSingle | QueryTypesList;
export class Query {
    static equal = (attribute: string, value: QueryTypes): string =>
      Query.addQuery(attribute, "equal", value);
  
    static notEqual = (attribute: string, value: QueryTypes): string =>
      Query.addQuery(attribute, "notEqual", value);
  
    static lesser = (attribute: string, value: QueryTypes): string =>
      Query.addQuery(attribute, "lesser", value);
  
    static lesserEqual = (attribute: string, value: QueryTypes): string =>
      Query.addQuery(attribute, "lesserEqual", value);
  
    static greater = (attribute: string, value: QueryTypes): string =>
      Query.addQuery(attribute, "greater", value);
  
    static greaterEqual = (attribute: string, value: QueryTypes): string =>
      Query.addQuery(attribute, "greaterEqual", value);
  
    static search = (attribute: string, value: string): string =>
      Query.addQuery(attribute, "search", value);
  
    private static addQuery = (attribute: string, oper: string, value: QueryTypes): string =>
      value instanceof Array
        ? `${attribute}.${oper}(${value
            .map((v: QueryTypesSingle) => Query.parseValues(v))
            .join(",")})`
        : `${attribute}.${oper}(${Query.parseValues(value)})`;
  
    private static parseValues = (value: QueryTypes): string =>
      typeof value === "string" || value instanceof String
        ? `"${value}"`
        : `${value}`;
}