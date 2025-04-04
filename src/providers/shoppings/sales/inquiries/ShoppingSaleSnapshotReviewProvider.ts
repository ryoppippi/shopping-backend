import { Prisma } from "@prisma/client";

import { IEntity } from "@samchon/shopping-api/lib/structures/common/IEntity";
import { IPage } from "@samchon/shopping-api/lib/structures/common/IPage";
import { IShoppingActorEntity } from "@samchon/shopping-api/lib/structures/shoppings/actors/IShoppingActorEntity";
import { IShoppingCustomer } from "@samchon/shopping-api/lib/structures/shoppings/actors/IShoppingCustomer";
import { IShoppingSaleReview } from "@samchon/shopping-api/lib/structures/shoppings/sales/inquiries/IShoppingSaleReview";

import { ShoppingGlobal } from "../../../../ShoppingGlobal";
import { ErrorProvider } from "../../../../utils/ErrorProvider";
import { PaginationUtil } from "../../../../utils/PaginationUtil";
import { BbsArticleProvider } from "../../../common/BbsArticleProvider";
import { BbsArticleSnapshotProvider } from "../../../common/BbsArticleSnapshotProvider";
import { ShoppingCustomerProvider } from "../../actors/ShoppingCustomerProvider";
import { ShoppingMileageHistoryProvider } from "../../mileages/ShoppingMileageHistoryProvider";
import { ShoppingSaleSnapshotInquiryAnswerProvider } from "./ShoppingSaleSnapshotInquiryAnswerProvider";
import { ShoppingSaleSnapshotInquiryProvider } from "./ShoppingSaleSnapshotInquiryProvider";
import { ShoppingSaleReviewSnapshotProvider } from "./ShoppingSaleSnapshotReviewSnapshotProvider";

export namespace ShoppingSaleReviewProvider {
  /* -----------------------------------------------------------
    TRANSFORMERS
  ----------------------------------------------------------- */
  export namespace summarize {
    export const transform = (
      input: Prisma.shopping_sale_snapshot_reviewsGetPayload<
        ReturnType<typeof select>
      >
    ): IShoppingSaleReview.ISummary => ({
      id: input.base.base.id,
      customer: ShoppingCustomerProvider.json.transform(input.base.customer),
      title: input.base.base.mv_last!.snapshot.title,
      score: input.base.base.mv_last!.snapshot.of_review!.score,
      created_at: input.base.base.created_at.toISOString(),
      updated_at: input.base.base.mv_last!.snapshot.created_at.toISOString(),
      read_by_seller: input.base.read_by_seller_at !== null,
      answer:
        input.base.answer !== null
          ? ShoppingSaleSnapshotInquiryAnswerProvider.summarize.transform(
              input.base.answer
            )
          : null,
    });
    export const select = () =>
      ({
        include: {
          base: {
            include: {
              base: {
                include: {
                  mv_last: {
                    include: {
                      snapshot: {
                        include: {
                          ...BbsArticleSnapshotProvider.json.select().include,
                          of_review: true,
                        },
                      },
                    },
                  },
                },
              },
              customer: ShoppingCustomerProvider.json.select(),
              answer:
                ShoppingSaleSnapshotInquiryAnswerProvider.summarize.select(),
            },
          },
        },
      }) satisfies Prisma.shopping_sale_snapshot_reviewsFindManyArgs;
  }

  export namespace abridge {
    export const transform = (
      input: Prisma.shopping_sale_snapshot_reviewsGetPayload<
        ReturnType<typeof select>
      >
    ): IShoppingSaleReview.IAbridge => ({
      ...BbsArticleProvider.abridge.transform(input.base.base),
      customer: ShoppingCustomerProvider.json.transform(input.base.customer),
      score: input.base.base.mv_last!.snapshot.of_review!.score,
      read_by_seller: input.base.read_by_seller_at !== null,
      answer:
        input.base.answer !== null
          ? ShoppingSaleSnapshotInquiryAnswerProvider.abridge.transform(
              input.base.answer
            )
          : null,
    });
    export const select = () =>
      ({
        include: {
          base: {
            include: {
              base: {
                include: {
                  mv_last: {
                    include: {
                      snapshot: {
                        include: {
                          ...BbsArticleSnapshotProvider.json.select().include,
                          of_review: true,
                        },
                      },
                    },
                  },
                },
              },
              customer: ShoppingCustomerProvider.json.select(),
              answer:
                ShoppingSaleSnapshotInquiryAnswerProvider.abridge.select(),
            },
          },
        },
      }) satisfies Prisma.shopping_sale_snapshot_reviewsFindManyArgs;
  }

  export namespace json {
    export const transform = (
      input: Prisma.shopping_sale_snapshot_reviewsGetPayload<
        ReturnType<typeof select>
      >
    ): IShoppingSaleReview => {
      const base = BbsArticleProvider.json.transform(input.base.base);
      return {
        ...base,
        snapshots: input.base.base.snapshots
          .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
          .map((snapshot) => {
            const rs = snapshot.of_review;
            if (rs === null)
              throw ErrorProvider.internal("Unable to get the score value.");
            return {
              ...BbsArticleSnapshotProvider.json.transform(snapshot),
              score: rs.score,
            };
          }),
        customer: ShoppingCustomerProvider.json.transform(input.base.customer),
        answer:
          input.base.answer !== null
            ? ShoppingSaleSnapshotInquiryAnswerProvider.json.transform(
                input.base.answer
              )
            : null,
        read_by_seller: input.base.read_by_seller_at !== null,
        type: "review",
      };
    };
    export const select = () =>
      ({
        include: {
          base: {
            include: {
              base: {
                include: {
                  snapshots: ShoppingSaleReviewSnapshotProvider.json.select(),
                },
              },
              customer: ShoppingCustomerProvider.json.select(),
              answer: ShoppingSaleSnapshotInquiryAnswerProvider.json.select(),
            },
          },
        },
      }) satisfies Prisma.shopping_sale_snapshot_reviewsFindManyArgs;
  }

  /* -----------------------------------------------------------
    READERS
  ----------------------------------------------------------- */
  export const index = async (props: {
    actor: IShoppingActorEntity;
    sale: IEntity;
    input: IShoppingSaleReview.IRequest;
  }): Promise<IPage<IShoppingSaleReview.ISummary>> => {
    if (props.actor.type === "seller")
      await ShoppingGlobal.prisma.shopping_sales.findFirstOrThrow({
        where: {
          id: props.sale.id,
          sellerCustomer: {
            member: {
              of_seller: {
                id: props.actor.id,
              },
            },
          },
        },
      });
    return PaginationUtil.paginate({
      schema: ShoppingGlobal.prisma.shopping_sale_snapshot_reviews,
      payload: summarize.select(),
      transform: summarize.transform,
    })({
      where: {
        AND: [
          {
            base: {
              snapshot: {
                shopping_sale_id: props.sale.id,
              },
            },
          },
          ...search(props.input.search),
        ],
      },
      orderBy: props.input.sort?.length
        ? PaginationUtil.orderBy(orderBy)(props.input.sort)
        : [{ base: { base: { created_at: "desc" } } }],
    })(props.input);
  };

  export const abridges = async (props: {
    actor: IShoppingActorEntity;
    sale: IEntity;
    input: IShoppingSaleReview.IRequest;
  }): Promise<IPage<IShoppingSaleReview.IAbridge>> => {
    if (props.actor.type === "seller")
      await ShoppingGlobal.prisma.shopping_sales.findFirstOrThrow({
        where: {
          id: props.sale.id,
          sellerCustomer: {
            member: {
              of_seller: {
                id: props.actor.id,
              },
            },
          },
        },
      });
    return PaginationUtil.paginate({
      schema: ShoppingGlobal.prisma.shopping_sale_snapshot_reviews,
      payload: abridge.select(),
      transform: abridge.transform,
    })({
      where: {
        AND: [
          {
            base: {
              snapshot: {
                shopping_sale_id: props.sale.id,
              },
            },
          },
          ...search(props.input.search),
        ],
      },
      orderBy: props.input.sort?.length
        ? PaginationUtil.orderBy(orderBy)(props.input.sort)
        : [{ base: { base: { created_at: "desc" } } }],
    })(props.input);
  };

  export const at = async (props: {
    actor: IShoppingActorEntity;
    sale: IEntity;
    id: string;
  }): Promise<IShoppingSaleReview> => {
    if (props.actor.type === "seller")
      await ShoppingGlobal.prisma.shopping_sales.findFirstOrThrow({
        where: {
          id: props.sale.id,
          sellerCustomer: {
            member: {
              of_seller: {
                id: props.actor.id,
              },
            },
          },
        },
      });
    const record =
      await ShoppingGlobal.prisma.shopping_sale_snapshot_reviews.findFirstOrThrow(
        {
          where: {
            id: props.id,
          },
          ...json.select(),
        }
      );
    return json.transform(record);
  };

  const search = (
    input: IShoppingSaleReview.IRequest.ISearch | null | undefined
  ) =>
    [
      ...ShoppingSaleSnapshotInquiryProvider.search(input).map((base) => ({
        base,
      })),
      ...(input?.minimum !== undefined && input?.minimum !== null
        ? [
            {
              base: {
                base: {
                  mv_last: {
                    snapshot: {
                      of_review: {
                        score: { gte: input.minimum },
                      },
                    },
                  },
                },
              },
            },
          ]
        : []),
      ...(input?.maximum !== undefined && input?.maximum !== null
        ? [
            {
              base: {
                base: {
                  mv_last: {
                    snapshot: {
                      of_review: {
                        score: { lte: input.maximum },
                      },
                    },
                  },
                },
              },
            },
          ]
        : []),
    ] satisfies Prisma.shopping_sale_snapshot_reviewsWhereInput["AND"];

  const orderBy = (
    key: IShoppingSaleReview.IRequest.SortableColumns,
    direction: "asc" | "desc"
  ) =>
    (key === "score"
      ? {
          base: {
            base: {
              mv_last: {
                snapshot: {
                  of_review: {
                    score: direction,
                  },
                },
              },
            },
          },
        }
      : {
          base: ShoppingSaleSnapshotInquiryProvider.orderBy(key, direction),
        }) satisfies Prisma.shopping_sale_snapshot_reviewsOrderByWithRelationInput;

  /* -----------------------------------------------------------
    WRITERS
  ----------------------------------------------------------- */
  export const create = async (props: {
    customer: IShoppingCustomer;
    sale: IEntity;
    input: IShoppingSaleReview.ICreate;
  }): Promise<IShoppingSaleReview> => {
    const good =
      await ShoppingGlobal.prisma.shopping_order_goods.findFirstOrThrow({
        where: {
          id: props.input.good_id,
          commodity: {
            snapshot: {
              shopping_sale_id: props.sale.id,
            },
          },
        },
        include: {
          order: {
            include: {
              customer: ShoppingCustomerProvider.json.select(),
              publish: true,
            },
          },
          commodity: {
            include: {
              snapshot: true,
            },
          },
        },
      });
    if (
      false ===
      ShoppingCustomerProvider.equals(
        props.customer,
        ShoppingCustomerProvider.json.transform(good.order.customer)
      )
    )
      throw ErrorProvider.forbidden({
        accessor: "input.good_id",
        message: "You are not allowed to review the good.",
      });
    else if (good.order.publish === null)
      throw ErrorProvider.unprocessable({
        accessor: "input.good_id",
        message: "The order is not published yet.",
      });
    else if (good.order.publish.paid_at === null)
      throw ErrorProvider.unprocessable({
        accessor: "input.good_id",
        message: "The order is not paid yet.",
      });
    else if (good.order.publish.cancelled_at !== null)
      throw ErrorProvider.unprocessable({
        accessor: "input.good_id",
        message: "The order is cancelled.",
      });

    const record =
      await ShoppingGlobal.prisma.shopping_sale_snapshot_reviews.create({
        data: collect({
          customer: props.customer,
          snapshot: {
            id: good.commodity.snapshot.id,
          },
          good,
          input: props.input,
        }),
        ...json.select(),
      });
    await ShoppingMileageHistoryProvider.emplace({
      citizen: props.customer.citizen!,
      mileage: {
        code: props.input.files.length
          ? "shopping_sale_snapshot_review_photo_reward"
          : "shopping_sale_snapshot_review_text_reward",
      },
      source: record,
      value: (v) => v!,
    });
    return json.transform(record);
  };

  export const update = async (props: {
    customer: IShoppingCustomer;
    sale: IEntity;
    id: string;
    input: IShoppingSaleReview.IUpdate;
  }): Promise<IShoppingSaleReview.ISnapshot> => {
    const review = await at({
      actor: props.customer,
      sale: props.sale,
      id: props.id,
    });
    if (review.customer.id !== props.customer.id)
      throw ErrorProvider.forbidden({
        accessor: "id",
        message: "This review is not yours.",
      });
    return ShoppingSaleReviewSnapshotProvider.create({
      review,
      input: props.input,
    });
  };

  const collect = (props: {
    customer: IShoppingCustomer;
    snapshot: IEntity;
    good: IEntity;
    input: IShoppingSaleReview.ICreate;
  }) =>
    ({
      base: {
        create: {
          type: "review",
          base: {
            create: BbsArticleProvider.collect(
              ShoppingSaleReviewSnapshotProvider.collect
            )(props.input),
          },
          customer: {
            connect: { id: props.customer.id },
          },
          snapshot: {
            connect: { id: props.snapshot.id },
          },
          read_by_seller_at: null,
          created_at: new Date(),
        },
      },
      good: {
        connect: { id: props.good.id },
      },
    }) satisfies Prisma.shopping_sale_snapshot_reviewsCreateInput;
}
