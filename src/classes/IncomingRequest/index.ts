import T from "../../bot";
import { sendMessageToUser } from "../../controllers";
import { Symbol } from "../../models/Symbol";
import { User } from "../../models/User";
import { INVALID_COMMAND_TEXT, INVALID_SYMBOL_TEXT, MULTIPLE_COMMANDS_TEXT, UNKNOWN_ERROR } from "../../types/constants";
import { CommandType, InvalidRequestType, SymbolDocument, UserDocument } from "../../types/twitter";

export class IncomingRequest {
    readonly tweetID: string;
    public readonly userID: string;
    readonly username: string;
    readonly screenName: string;
    readonly text: string;
    readonly reTweeted: boolean;
    public commandType: CommandType;

    constructor(tweetID: string, userID: string, accountName: string, screenName: string, text: string, reTweeted: boolean, type: CommandType) {
        this.tweetID = tweetID;
        this.userID = userID;
        this.username = accountName;
        this.screenName = screenName;
        this.text = text;
        this.reTweeted = reTweeted;
        this.commandType = type == null ? CommandType.UNSET : type;

        // log
        this.log()
    }

    public static extractSymbols(hashtags: Array<Object>): Array<string> {
        return hashtags.map((tag: any) => tag.text);
    }

    /**
     * @description Check if user exists in DB, if not - add user to DB.
     * @param twitterID - twitter ID
     * @param username twitter name
     * @param screen_name twitter `@username`
     * @returns Promise<boolean>
     */

    public static async validateUser(twitterID: string, username: string, screen_name: string): Promise<UserDocument> {
        let currentUser: UserDocument | null = await User.findOne({twitterID}).exec();

        if (!currentUser) {
            const newUser: UserDocument = new User({
                twitterID,
                username,
                screen_name,
                subscriptions: [],
                alerts: []
            })

            newUser.save();
            return newUser;
        }

        return currentUser;
    }


    /**
     * @description Check if symbol exists in DB, if not - add symbol to DB.
     * @param symbol {String} Current symbol string
     */

     public static async validateSymbol(symbol: string): Promise<SymbolDocument> {
        let currentSymbol: SymbolDocument | null = await Symbol.findOne({symbol}).exec();
        
        if (!currentSymbol) {
            const newSymbol: SymbolDocument = new Symbol({ symbol, users: [] });

            newSymbol.save();
            return newSymbol;
        }

        return currentSymbol;
    }

    /**
     * @description Search this.text for CommandTypes
     * If doesn't match any of the CommandTypes, set as new IncomingRequest(). 
     * Otherwise, for add - new AddRequest() etc..
     * 
     * @returns CommandType[] enum
     */

    public static validateRequest(text: string): CommandType[] {
        var commands = [];

        var addKeyword = 'add'
        var addKeywordRegex = new RegExp("(^| +)" + addKeyword + "( +|[.])", "i");
        var isAddRequest = addKeywordRegex.test(text)

        var removeKeyword = 'remove'
        var removeKeywordRegex = new RegExp("(^| +)" + removeKeyword + "( +|[.])", "i");
        var isRemoveRequest = removeKeywordRegex.test(text)

        var setalertKeyword = 'setalert'
        var setalertKeywordRegex = new RegExp("(^| +)" + setalertKeyword + "( +|[.])", "i");
        var isSetAlertRequest = setalertKeywordRegex.test(text)

        var removealertKeyword = 'removealert'
        var removealertKeywordRegex = new RegExp("(^| +)" + removealertKeyword + "( +|[.])", "i");
        var isRemoveAlertRequest = removealertKeywordRegex.test(text)

        if(isAddRequest) {
            commands.push(CommandType.ADD)
        }
        if(isRemoveRequest) {
            commands.push(CommandType.REMOVE)
        }
        if(isSetAlertRequest) {
            commands.push(CommandType.SETALERT)
        }
        if(isRemoveAlertRequest) {
            commands.push(CommandType.REMOVEALERT)
        }

        return commands;
    }

    /**
     * classes/IncomingRequest
     * @description notify user of an invalid command or request.
     * @param type {Enum} Type of invalidity.
     */
    public notifyInvalidRequest(type: InvalidRequestType, customText?: string): void {

        // Switch case
        switch(type) {
            case InvalidRequestType.INVALID_COMMAND:
                sendMessageToUser(this.userID, INVALID_COMMAND_TEXT);
                break;

            case InvalidRequestType.MULTIPLE_COMMANDS:
                sendMessageToUser(this.userID, MULTIPLE_COMMANDS_TEXT);
                break;

            case InvalidRequestType.INVALID_SYMBOL:
                customText ? sendMessageToUser(this.userID, customText) : sendMessageToUser(this.userID, INVALID_SYMBOL_TEXT);
                break;

            case InvalidRequestType.UNKNOWN:
                sendMessageToUser(this.userID, UNKNOWN_ERROR);
                break;
                
            default:
                break;
        }

    }

    public log(): void {
        console.group(`TWEET ID: `.bgGreen, this.tweetID);
                console.log('USER ID: '.bgMagenta, this.userID);
                console.log('Screen Name: '.bgMagenta, this.screenName);
                console.log('TEXT: '.bgMagenta, this.text);
                console.log('COMMAND TYPE: '.bgMagenta, this.commandType);
        console.groupEnd();
    }

    protected likeTweet () {
        T.post('favorites/create',  {id: this.tweetID}, (err, data, response) => {
            if (err) {
                console.log(err)
            }
        });
    }
}