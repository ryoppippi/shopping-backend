import { Prisma } from "@prisma/client";
import { AttachmentFileProvider } from "../../common/AttachmentFileProvider";
import { IShoppingSaleContent } from "@samchon/shopping-api/lib/structures/shoppings/sales/IShoppingSaleContent";
import { v4 } from "uuid";

export namespace ShoppingSaleSnapshotContentProvider {
  export namespace json {
    export const transform = (
      input: Prisma.shopping_sale_snapshot_contentsGetPayload<
        ReturnType<typeof select>
      >
    ): IShoppingSaleContent => ({
      id: input.id,
      title: input.title,
      format: input.format as "txt",
      body: input.body,
      files: input.to_files.map(r => AttachmentFileProvider.json.transform(r.file)),
      thumbnails: input.to_thumbnails.map(r => AttachmentFileProvider.json.transform(r.file)),
    })
    export const select = () => ({
      include: {
        to_files: {
          include: {
            file: AttachmentFileProvider.json.select(),
          },
        },
        to_thumbnails: {
          include: {
            file: AttachmentFileProvider.json.select(),
          },
        },
      },
    } satisfies Prisma.shopping_sale_snapshot_contentsFindManyArgs);
  }

  export const collect = (input: IShoppingSaleContent.ICreate) => ({
    id: v4(),
    title: input.title,
    body: input.body,
    format: input.format,
    to_thumbnails: {
      create: input.thumbnails.map((f, i) => ({
        id: v4(),
        file: {
          create: AttachmentFileProvider.collect(f),
        },
        sequence: i,
      })),
    },
    to_files: {
      create: input.files.map((f, i) => ({
        id: v4(),
        file: {
          create: AttachmentFileProvider.collect(f),
        },
        sequence: i,
      })),
    },
  } satisfies Prisma.shopping_sale_snapshot_contentsCreateWithoutSnapshotInput)
}