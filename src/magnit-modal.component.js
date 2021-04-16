const elementName = 'magnit-modal';
const shadeClass = 'modal-shade';
const KEYCODE = { ESC: 27, ENTER: 13, SPACE: 32, TAB: 9 };
const OFFSET = 10;
let modalCount = 0;
var lastDisposableId = 0;

const internal = Symbol();
export const BaseComponent = (htmlElementClass = HTMLElement) => class extends htmlElementClass
{
    // basic component scaffolding
    static get observedAttributes() { return []; }

    get isInitialized()
    {
        return this[internal].isInitialized;
    }
    set isInitialized(value)
    {
        this[internal].isInitialized = value;
    }
    get isConnected()
    {
        return this[internal].isConnected;
    }
    set isConnected(value)
    {
        this[internal].isConnected = value;
    }

    async connectedCallback() { await this.init(); this.isConnected = true; this.dispatchComponentEvent(this, 'onconnect'); }
    attributeChangedCallback(name, oldValue, newValue)
    {
        if(!this.isConnected)
        {
            return;
        }
        this.update({ [name]: newValue });
        this.dispatchComponentEvent(this, 'onattributechanged', { name: name, oldValue: oldValue, newValue: newValue });
    }
    async disconnectedCallback() { await this.destruct(); this.isConnected = false; this.dispatchComponentEvent(this, 'ondisconnect'); }
    adoptedCallback() { this.dispatchComponentEvent(this, 'onadopted'); }

    // component definition
    constructor(attributes)
    {
        super();
        this[internal] = {};
        this.isInitialized = false;
        if(attributes != null)
        {
            for(let property in attributes)
            {
                if(attributes.hasOwnProperty(property))
                {
                    this.setAttribute(property, attributes[property]);
                }
            }
        }
    }
    init(){}
    update(){}
    destruct(){}

    // helper functions
    dispatchComponentEvent($target, eventName, data)
    {
        if($target == this)
        {
            let customEvent = (data) ? new CustomEvent(eventName, { detail: data }) : new CustomEvent(eventName);
            this.dispatchEvent(customEvent);
        }
        this.dispatchAttributeEvents($target, eventName, data);
    }
    dispatchAttributeEvents($target, eventName, data)
    {
        let handlerAttributeName = 'on' + eventName;
        let onEvent = $target.getAttribute(handlerAttributeName);
        if(onEvent && onEvent != 'null')
        {
            try
            {
                onEvent = onEvent.split('.').reduce((o,i)=> { return o[i]; }, window);
                
                let context = this;
                let eventContext = $target.getAttribute('event-context');
                if(eventContext != null)
                {
                    context = eventContext.split('.').reduce((o,i)=> { return o[i]; }, window);
                }
                onEvent.apply(context, {target: $target, detail: data });
            }
            catch(exception)
            {
                console.error("Unable to execute callback: ");
                console.error(exception);
            }
        }
    }

    attachDOM(template)
    {
        let fragment;
        if(!(template instanceof HTMLTemplateElement))
        {
            let content = template;
            template = document.createElement('template');
            template.innerHTML = content;
        }
        fragment = template.content.cloneNode(true);

        const slots = fragment.querySelectorAll('slot');
        for(const $slot of slots)
        {
            const $replacement = this.querySelector(`[slot="${$slot.name}"]`);
            if($replacement != null)
            {
                $replacement.classList.add($slot.name);
                $slot.parentNode.replaceChild($replacement, $slot);
            }
            else if($slot.firstElementChild != null)
            {
                $slot.parentNode.replaceChild($slot.firstElementChild, $slot);
            }
        }

        this.innerHTML = "";
        this.appendChild(fragment);
    }

    registerStyle(styleId)
    {
        let target = (this.shadowRoot == null) ? this : this.shadowRoot;
        let style = target.querySelector('style');
        if(style == null)
        {
            return;
        }

        style.remove();

        let existingStyle = document.querySelector(`style[data-id="${styleId}"]`);
        if(existingStyle == null)
        {
            style.dataset.id = styleId;
            document.head.appendChild(style);
        }        
    }
    
    getDescendants($node, recurse)
    {
        $node = $node || this;
        recurse = (recurse == false) ? false : true;
        let descendants = [];
        for(let i = 0; i < $node.childNodes.length; i++)
        {
            let node = $node.childNodes[i];
            descendants.push(node)
            if(node.childNodes && recurse == true)
            {
                descendants.push(...this.getDescendants(node))
            }
        }

        return descendants;
    }
}
const styleId = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16) );
const disposableId = function() { return lastDisposableId++; }
export default class MagnitModalComponent extends BaseComponent()
{
    static get observedAttributes() { return ['use-shade', 'shade-close', 'close-button']; }
    static register() { if(!customElements.get(elementName)) { customElements.define(elementName, MagnitModalComponent); } }

    static get modalCount() { return modalCount; }
    static set modalCount(value) { modalCount = value; }

    get loading()
    {
        this.getAttribute('loading');
    }
    set loading(value)
    {
        if(value === true)
        {
            this.setAttribute('loading', '');
            return;
        }
        this.removeAttribute('loading');
    }
    get useShade()
    {
        return (this.getAttribute('use-shade') == "true") ? true : false;
    }
    get shadeClose()
    {
        return (this.getAttribute('shade-close') == "true") ? true : false;
    }
    get isOpen()
    {
        return this.classList.contains('open');
    }

    constructor(attributes)
    {
        super(attributes);

        this.disposableId = disposableId();
        this.asking = false;

        this[internal] = {};

        this[internal].document_onKeydown = document_onKeydown.bind(this);
        this[internal].initFocus = initModalFocus.bind(this);
        this[internal].addShade = addShade.bind(this);
        this[internal].removeShade = removeShade.bind(this);

        this[internal].closeElement_onClick = closeElement_onClick.bind(this);
        this[internal].choice_onClick = choice_onClick.bind(this);
        this[internal].tryClose = tryClose.bind(this);

        this[internal].preventFocus = preventFocus.bind(this, [this]);
        this[internal].restoreFocus = restoreFocus.bind(this);
    }

    init()
    {
        //TODO: 
        // create a management api task board
        // combine into single-file component;
        
        this.setAttribute('role', 'dialog');
        
        let properties = 
        {
            'use-shade': this.getAttribute('use-shade') || 'true',
            'shade-close': this.getAttribute('shade-close') || 'false',
            'close-button': this.getAttribute('close-button') || 'true'
        };
        if(this.isInitialized)
        {
            this.update(properties);
            return;
        }
        
        // const template = document.getElementById('modal-window'); // get the template from a document node, rather than a string; useful for debugging
        const template = templateContent;
        this.attachDOM(template); // replace slots, without using the shadowDOM (because the API is half-baked)
        this.registerStyle(styleId);
        
        
        this.$titleIcon = this.querySelector('.identity .icon');
        this.$title = this.querySelector('.identity .title');
        this.$controls = this.querySelector('.controls');
        this.$closeControl = this.$controls.querySelector('.control.close, .control.close button, .control .close');
        this.$content = this.querySelector('.content');
        this.$footer = this.querySelector('footer');
        this.$shade = this.querySelector(`.${shadeClass}`);
        this.$choices = this.querySelector('.choices') || document.createElement('ul');

        this.$shade.remove();

        if(this.$closeControl == null)
        {
            this.$closeControl = document.createElement('button');
            this.$closeControl.type = 'button';
            this.$closeControl.classList.add('control', 'close');
            this.$closeControl.title = "Close modal";
            this.$closeControl.innerHTML = defaultCloseButtonContent;
        }

        this.$title.classList.add('title');
        this.$titleIcon.classList.add('title');
        this.$content.classList.add('content');
        this.$choices.classList.add('.choices');

        this.style.display = null;

        this.$title.id = 'modal-title_' + this.disposableId;
        this.setAttribute('aria-labelledby', this.$title.id);

        this.$closeControl.addEventListener('click', this[internal].closeElement_onClick);
        this.$shade.addEventListener('click', this[internal].closeElement_onClick);
        
        let type = this.getAttribute('type');
        if(type === 'message')
        {
            let $okButton = this.$choices.querySelector('button.ok');
            if($okButton == null)
            {
                $okButton = document.createElement('button');
                $okButton.textContent = 'Ok';
                $okButton.classList.add('ok');
                this.$choices.appendChild($okButton);
            }
            $okButton.type = 'button';
            $okButton.classList.add('choice');
            $okButton.addEventListener('click', this[internal].closeElement_onClick);
        }

        if(this.$choices != null)
        {
            let choices = this.$choices.querySelectorAll('button');
            for(const $choice of choices)
            {
                $choice.addEventListener('click', this[internal].choice_onClick);
            }
        }


        this.isInitialized = true;
        this.update(properties);
    }
    update(properties)
    {
        for(let propertyName in properties)
        {
            if(properties.hasOwnProperty(propertyName))
            {
                if(propertyName == 'use-shade')
                {
                    let value = (properties[propertyName] == "true") ? true : false;
                    if(this.isInitialized == true)
                    {
                        if(value == true)
                        {
                            this.$shade.style.removeProperty('--shade-opacity');
                        }
                        else
                        {
                            this.$shade.style.setProperty('--shade-opacity', 0);
                        }
                    }
                }
                else if(propertyName == 'shade-close')
                {
                    let value = (properties[propertyName] == "true") ? true : false;
                    if(this.isInitialized == true)
                    {
                        if(value === true)
                        {
                            this.$shade.addEventListener('click', this[internal].shadeClickHandler);
                            return;
                        }
                        this.$shade.removeEventListener('click', this[internal].shadeClickHandler);
                    }
                }
                else if(propertyName == 'close-button')
                {
                    let value = (properties[propertyName] == "true") ? true : false;
                    if(this.isInitialized == true)
                    {
                        if(value === true)
                        {
                            this.$controls.appendChild(this.$closeControl);
                        }
                        else
                        {
                            this.$closeControl.remove();
                        }
                    }
                }
            }
        }
    }
    destruct()
    {
        // cleanup, in case of deconstruction while modal is open.
        document.removeEventListener('keydown', this[internal].document_onKeydown);
    }

    // functionality
    ask(canCloseTest = -1)
    {
        this.asking = true;
        if(this.$choices == null || this.$choices.children.length == 0)
        {
            return Promise.reject('No choices available to await.');
        }
        return new Promise((resolve) =>
        {
            const choiceHandler = async (event) =>
            {
                const result = (canCloseTest === -1) ? true : await canCloseTest(event.detail.$choice);
                if(result != false)
                {
                    if(event.detail.$choice == this.$shade && this.shadeClose != true)
                    {
                        this.addEventListener('onchoice', choiceHandler, {once: true});
                        return;
                    }
                                        
                    this.$closeControl.removeEventListener('click', this[internal].choice_onClick);

                    this.asking = false;
                    this.close();
                    resolve(event.detail.$choice);
                    return;
                }
                this.addEventListener('onchoice', choiceHandler, {once: true});
            };
            this.addEventListener('onchoice', choiceHandler, {once: true});

            this.$closeControl.addEventListener('click', this[internal].choice_onClick);
            this.$shade.addEventListener('click', this[internal].choice_onClick);

            this.open();
        });
    }

    async open()
    {
        if(this.classList.contains('open'))
        {
            return;
        }
        this.$previousActiveElement = document.activeElement;
        this[internal].addShade();
        document.addEventListener('keydown', this[internal].document_onKeydown);

        this[internal].preventFocus();

        if(MagnitModalComponent.modalCount > 0)
        {
            this.style.setProperty('--top-offset', -(MagnitModalComponent.modalCount * OFFSET) + 'px');
            this.style.setProperty('--left-offset', (MagnitModalComponent.modalCount * OFFSET) + 'px');
        }

        this.classList.add('open');
        MagnitModalComponent.modalCount++;
        this.dispatchComponentEvent(this, 'onopen');
        this[internal].initFocus();
    }
    async close()
    {
        document.removeEventListener('keydown', this[internal].document_onKeydown);

        this[internal].restoreFocus();

        this[internal].removeShade();
        this.classList.remove('open');
        this.style.removeProperty('--top-offset');
        this.style.removeProperty('--left-offset');
        if(this.$previousActiveElement != null)
        {
            this.$previousActiveElement.focus();
        }
        MagnitModalComponent.modalCount--;
        this.dispatchComponentEvent(this, 'onclose');
    }

    submitForm($form, handler)
    {
        return new Promise((resolve, reject) =>
        {
            const internalHandler = (event) =>
            {
                let result = false;
                try
                {
                    result = handler(event);
                    resolve(result);
                }
                catch(exception)
                {
                    reject(exception);
                    return false;
                }
                finally 
                {
                    return result;
                }
            };
            if($form.reportValidity() == false)
            {
                reject('invalid');
                return;
            }
            $form.addEventListener('submit', internalHandler, { once: true });
            $form.requestSubmit();
        });
    }
}

function addShade()
{        
    if(this.$shade.parentNode != null)
    {
        return;
    }
    
    this.parentNode.insertBefore(this.$shade, this);
}
function removeShade()
{
    this.$shade.remove();
}

function tryClose()
{
    if(this.asking == true)
    {
        return;
    }
    this.close();
}

function closeElement_onClick(event)
{
    if(event.currentTarget == this.$shade && this.shadeClose != true)
    {
        return;
    }
    this[internal].tryClose();
}
function choice_onClick(event)
{
    this.dispatchComponentEvent(this, 'onchoice', { $choice: event.currentTarget });
}

function document_onKeydown(event)
{
    if(event.which == KEYCODE.ESC)
    {
        this.close();
    }
}

function initModalFocus()
{
    const $header = this.querySelector('header');
    const focusable = getFocusableElements(this);
    if(focusable == null)
    {
        return;
    }
    for(const $focusable of focusable)
    {
        if($header != null && $header != $focusable && !$header.contains($focusable))
        {
            $focusable.focus();
            return;
        }
    }
}
function getFocusableElements($parent = document)
{
    return [...$parent.querySelectorAll(
        'a, button, input, textarea, select, details,[tabindex]:not([tabindex*="-"])'
      )].filter($el => !$el.hasAttribute('disabled')); // gets all focusable elements that aren't disabled and don't have a negative tabindex attribute; also ignores header controls
    
}

function preventFocus(exceptions = [])
{
    if(MagnitModalComponent.modalCount > 0)
    {
        return;
    }
    const focusable = getFocusableElements();
    for(const $focusable of focusable)
    {
        let except = false;
        if(exceptions.length > 0)
        {
            for(const $exception of exceptions)
            {
                if($exception == $focusable || $exception.contains($focusable))
                {
                    except = true;
                    break;
                }
            }
        }

        if(except == true)
        {
            continue;
        }

        if($focusable.hasAttribute('tabindex'))
        {
            $focusable[internal] = $focusable.getAttribute('tabindex');
        }
        $focusable.setAttribute('tabindex', '-1');
        $focusable.dataset.modifyingModal = this.disposableId;
    }
}
function restoreFocus()
{
    if(MagnitModalComponent.modalCount > 1)
    {
        return;
    }
    const focusable = document.querySelectorAll('[data-modifying-modal]');
    for(const $focusable of focusable)
    {
        if($focusable.hasOwnProperty(internal))
        {
            $focusable.setAttribute('tabindex', $focusable[internal]);
        }
        else
        {
            $focusable.removeAttribute('tabindex');
        }
        $focusable.removeAttribute('data-modifying-modal');
    }
}

const defaultCloseButtonContent = `<svg class="icon close" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M23 20.168l-8.185-8.187 8.185-8.174-2.832-2.807-8.182 8.179-8.176-8.179-2.81 2.81 8.186 8.196-8.186 8.184 2.81 2.81 8.203-8.192 8.18 8.192z"/></svg>`;
const templateContent = `<style>
.${shadeClass} { --shade-opacity: .5; position:fixed; top:-1px; left:-1px; right: -1px; bottom: -1px; z-index: 1000; background-color: rgba(0,0,0,var(--shade-opacity)); }

${elementName}
{
    --primary-color: #707683;
    --font-color: #393939;
    --background-color: #e9e9eb;
    --background: var(--background-color);
    --top-offset: 0px;
    --left-offset: 0px;
    position: fixed;
    top: calc(50% + var(--top-offset));
    left: calc(50% + var(--left-offset));
    transform: translate(-50%, -50%);
    z-index:1001;
    width: max-content;
    background: var(--background);
    color: var(--font-color);
    display: flex;
    flex-direction: column;
    border: solid 1px var(--primary-color);
    box-shadow: 1px 1px 5px 2px rgb(0 0 0 / 30%);
    min-width: 400px;
    max-width: 90%;
    pointer-events: none;
    visibility: hidden;
    opacity: 0;
    transition:  opacity 200ms linear;
}
${elementName}.open
{
    pointer-events: initial;
    visibility: visible;
    opacity: 1;
}

${elementName} .controls, ${elementName} .choices { list-style: none; margin: 0; padding: 0; }
${elementName} .controls button, ${elementName} .choices button { all: initial; pointer-events: inherit; cursor: pointer; }
${elementName} .controls button:hover, ${elementName} .choices button:hover { filter: saturate(110%) brightness(1.05); }
${elementName} .controls button:active, ${elementName} .choices button:active { transform: scale(.96); }

${elementName} *:focus { --focus-ring-size: 2px; outline: solid var(--focus-ring-size) currentColor; outline-offset: calc(calc(var(--focus-ring-size) * -1) / 2); }
${elementName} *:focus:focus-visible { outline-style: auto; }
${elementName} *:focus:not(:focus-visible) { outline-style: none; }

${elementName} svg path { fill: var(--primary-color); }
${elementName}.info { --primary-color:#3d84e5; --background-color: #cde2ff; }
${elementName}.success { --primary-color:#3ac279; --background-color: #c5f7dc; }
${elementName}.warning { --primary-color:#e89f29; --background-color: #ffe8c3; }
${elementName}.error { --primary-color:#e9594c; --background-color: #ffcfcb; }

${elementName} .icon.title
{
    --size: 20px;
    width: var(--size);
    height: auto;
    margin-right: .5em;
}

${elementName} > header
{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: .2em .4em;
    margin-bottom: 1em;
}

${elementName} > header .identity
{
    display: flex;
    align-items: center;
    font-size: 1.3em;
    font-weight: bold;
}

${elementName} > header .control
{
    background: none;
    border: none;
    min-width: initial;
    flex: initial;
    padding: 0;
    display: flex;
    align-items: center;
}
${elementName} > header .control svg
{
    --size: 18px;
    width: var(--size);
    height: auto;
}

${elementName} > .content
{
    max-height: 80vh;
    max-width: 80vw;
    overflow: auto;
    padding: .2em 1.5em;
}

${elementName} ul.choices
{
    display: flex;
    justify-content: flex-end;
    padding: .4em;
}

${elementName} .choices li
{
    margin-right: .5em;
}
${elementName} .choices li:last-of-type
{
    margin-right: 0;
}

${elementName} .choices button
{
    background-color: var(--primary-color);
    border: solid 1px rgba(0,0,0,.4);
    color: #fff;
    flex: initial;
    min-width: 2ch; padding: .3em 2em; 
}

${elementName} > footer
{
    margin-top: 1em;
}



${elementName}[type="message"] .content
{
    display: flex;
    align-items: center;
    justify-content: center;
}

${elementName}[type="message"] .content .icon-container
{
    padding: .5em;
    margin-right: 1.5em;
}

${elementName}[type="message"] .content .icon-container svg
{
    --size: 42px;
    width: var(--size);
    height: auto;
}

${elementName}[type="message"] .content .message
{
    flex: 1;
}

${elementName}[type="message"] .content .message h5
{
    margin: 0;
}
</style>
<header>
<div class="identity">
    <slot name="title-icon">
        <svg class="icon title-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm1 18h-2v-8h2v8zm-1-12.25c.69 0 1.25.56 1.25 1.25s-.56 1.25-1.25 1.25-1.25-.56-1.25-1.25.56-1.25 1.25-1.25z"/></svg>
    </slot>
    <slot name="title"><span class="title">Message</span></slot>
</div>
<slot name="controls" class="controls">
    <ul class="controls">
        <li>
            <button class="control close" type="button" title="Close modal">
                ${defaultCloseButtonContent}
            </button>
        </li>
    </ul>
</slot>
</header>
<slot name="content"><div class="content"></div></slot>
<footer>
<slot name="choices">
    <ul class="choices"></ul>
</slot>
</footer>
<div class="${shadeClass}"></div>`;

MagnitModalComponent.register();