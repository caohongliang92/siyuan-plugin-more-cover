import {BindHtmlEvent, Cover, CoverProvider, CoverProviderConfig, PageResult} from "./CoverProvider";
import {Dialog, I18N} from "siyuan";
import MoreCoverPlugin from "../index";

export class PixabayConfig implements CoverProviderConfig {
    id = "pixabay";
    name = "Pixabay";
    enable = false;
    key = "";
    language = "en";

    validate(i18n: I18N): readonly [boolean, string] {
        if (!this.enable) {
            return [true, ""];
        }
        const msg: string[] = [];
        if (!this.key) {
            msg.push(i18n.pixabay.keyNotNull);
        }
        return msg.length <= 0 ? [true, ""] : [false, msg.join("\n")];
    }
}


export interface PixabayHit {
    id: number;
    pageURL: string;
    type: string;
    tags: string;
    previewURL: string;
    previewWidth: number;
    previewHeight: number;
    webformatURL: string;
    webformatWidth: number;
    webformatHeight: number;
    imageURL: string;
    largeImageURL: string;
    imageWidth: number;
    imageHeight: number;
    imageSize: number;
    views: number;
    downloads: number;
    collections: number;
    likes: number;
    comments: number;
    user_id: number;
    user: string;
    userImageURL: string;
}

export interface PixabayResp {
    total: number;
    totalHits: number;
    hits: PixabayHit[];
}

export class PixabayProvider extends CoverProvider<PixabayConfig> {
    config: PixabayConfig;

    randomCovers(pageNum: number): Promise<PageResult> {
        return Promise.resolve(undefined);
    }

    searchCovers(keyword: string, pageNum: number): Promise<PageResult> {
        const pageSize = 30;
        const url = `https://pixabay.com/api/?key=${this.config.key}&q=${keyword}&lang=${this.config.language}&page=${pageNum}&per_page=${pageSize}`;

        return new Promise<PageResult>((resolve, reject) => {
            fetch(url)
                .then(response => response.json())
                .then(rs => {
                    const response = rs as PixabayResp;
                    const pageResult = new PageResult(pageNum, pageSize, response.total, response.hits?.map(value => {
                        return {
                            id: value.id + "",
                            username: value.user,
                            thumbUrl: value.previewURL,
                            downloadUrl: value.largeImageURL || value.imageURL,
                            htmlUrl: value.pageURL,
                            description: value.tags
                        };
                    }), []);
                    resolve(pageResult);
                })
                .catch(reason => {
                    reject(reason);
                });

        });
    }

    downloadCover(event: Event): Promise<Cover> {
        const target = event.target as HTMLElement;
        const id = target.dataset.imageId;
        const url = target.dataset.downloadUrl;
        const format = "png";

        return new Promise<Cover>((resolve, reject) => {
            fetch(url)
                .then(response => {
                    return response.blob();
                })
                .then(blob => {
                    const cover = new Cover(id, url, format, blob);
                    resolve(cover);
                })
                .catch(reason => {
                    reject(reason);
                });
        });
    }

    makeSettingHtml(i18n: I18N,
                    saveSetting: Promise<HTMLElement>,
                    bindEvent: Promise<{
                        plugin: MoreCoverPlugin;
                        dialog: Dialog;
                        target: HTMLElement
                    }>): string {


        return `
<fieldset class="pmc-config-${this.config.id}">
    <legend>&nbsp;${this.config.name}&nbsp;</legend>
    <div class="pmc-config_line">
        <label>${i18n.enable}:&nbsp;</label>
        <input type="checkbox" ${this.config.enable ? "checked" : ""} 
            class="pmc-config-enable pmc-switch b3-switch fn__flex-center"/>      
    </div>
    <div class="pmc-config_line">
        <label>Key:&nbsp;</label><input class="pmc-config-key" type="text" value="${this.config.key}" style="flex: 1">        
    </div>
</fieldset>
        `;
    }

    makeAfterSelectHtml(i18n: I18N, bindEvent: Promise<BindHtmlEvent>): string {
        const languages = new Map<string, string>([
            ["zh", i18n.languages.zh],
            ["en", i18n.languages.en],
        ]);

        let html = `<select class="pmc-after-change-${this.config.id} pmc-search-pixabay-language-select">`;
        languages.forEach((code, name) => {
            html += `<option value="${code}" ${code == this.config.language ? "selected" : ""}>${name}</option>`;
        });
        html += "</select>";

        bindEvent.then(bhe => {
            bhe.target.addEventListener("change", evt => {
                const target = evt.target as HTMLSelectElement;
                const id = target.options[target.selectedIndex].value;
                bhe.searchInput.dispatchEvent(new InputEvent("input"));
                bhe.searchBtn?.dispatchEvent(new Event("click"));
                bhe.plugin.configs.pixabay.language = id;
                bhe.plugin.saveData(bhe.plugin.storage_name, bhe.plugin.configs).then(r => console.log(`保存${this.config.id}下拉框成功`, r));
                // 切换下拉框后也需要焦点
                bhe.searchInput.focus();
            });
        });

        return html;
    }


}